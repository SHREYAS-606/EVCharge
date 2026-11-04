
const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.use(authMiddleware, adminMiddleware);

// Allowed statuses
const STATION_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE"];

const CHARGER_STATUSES = [
    "AVAILABLE",
    "OCCUPIED",
    "OUT_OF_SERVICE",
    "MAINTENANCE"
];

// Validate positive integer IDs
const validId = (id) =>
    Number.isInteger(Number(id)) && Number(id) > 0;

// Validate station details
const validateStation = (data) => {
    const {
        station_name,
        address,
        latitude,
        longitude,
        opening_time,
        closing_time
    } = data;

    if (
        !station_name?.trim() ||
        !address?.trim() ||
        latitude === undefined ||
        longitude === undefined ||
        !opening_time ||
        !closing_time
    ) {
        return "All required station fields must be provided.";
    }

    if (
        !Number.isFinite(Number(latitude)) ||
        Number(latitude) < -90 ||
        Number(latitude) > 90
    ) {
        return "Latitude must be between -90 and 90.";
    }

    if (
        !Number.isFinite(Number(longitude)) ||
        Number(longitude) < -180 ||
        Number(longitude) > 180
    ) {
        return "Longitude must be between -180 and 180.";
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

    if (
        !timePattern.test(opening_time) ||
        !timePattern.test(closing_time)
    ) {
        return "Opening and closing times must be valid times (HH:MM or HH:MM:SS).";
    }

    return null;
};

// GET /api/admin/stations
// View all stations with charger statistics
router.get("/stations", async (req, res) => {
    try {
        const [stations] = await pool.query(`
            SELECT
                s.station_id,
                s.station_name,
                s.address,
                s.latitude,
                s.longitude,
                s.operator,
                s.opening_time,
                s.closing_time,
                s.status,
                s.created_at,
                s.updated_at,
                COUNT(c.charger_id) AS total_chargers,
                SUM(
                    CASE WHEN c.status = 'AVAILABLE'
                    THEN 1 ELSE 0 END
                ) AS available_chargers,
                SUM(
                    CASE WHEN c.status = 'OCCUPIED'
                    THEN 1 ELSE 0 END
                ) AS occupied_chargers
            FROM charging_station s
            LEFT JOIN charger c
                ON s.station_id = c.station_id
            GROUP BY s.station_id
            ORDER BY s.station_id DESC
        `);

        res.status(200).json({
            count: stations.length,
            stations
        });

    } catch (error) {
        console.error("Fetch admin stations error:", error);

        res.status(500).json({
            message: "Failed to fetch stations."
        });
    }
});

// POST /api/admin/stations
// Add a new station
router.post("/stations", async (req, res) => {
    try {
        const validationError = validateStation(req.body);

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        const {
            station_name,
            address,
            latitude,
            longitude,
            operator,
            opening_time,
            closing_time
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO charging_station
            (
                station_name,
                address,
                latitude,
                longitude,
                operator,
                opening_time,
                closing_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                station_name.trim(),
                address.trim(),
                Number(latitude),
                Number(longitude),
                operator?.trim() || null,
                opening_time,
                closing_time
            ]
        );

        res.status(201).json({
            message: "Charging station added successfully.",
            stationId: result.insertId
        });

    } catch (error) {
        console.error("Add station error:", error);

        res.status(500).json({
            message: "Failed to add charging station."
        });
    }
});

// PUT /api/admin/stations/:stationId
// Update station details
router.put("/stations/:stationId", async (req, res) => {
    try {
        const { stationId } = req.params;

        if (!validId(stationId)) {
            return res.status(400).json({
                message: "Invalid station ID."
            });
        }

        const validationError = validateStation(req.body);

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        const {
            station_name,
            address,
            latitude,
            longitude,
            operator,
            opening_time,
            closing_time
        } = req.body;

        const [result] = await pool.query(
            `UPDATE charging_station
            SET
                station_name = ?,
                address = ?,
                latitude = ?,
                longitude = ?,
                operator = ?,
                opening_time = ?,
                closing_time = ?
            WHERE station_id = ?`,
            [
                station_name.trim(),
                address.trim(),
                Number(latitude),
                Number(longitude),
                operator?.trim() || null,
                opening_time,
                closing_time,
                Number(stationId)
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Station not found."
            });
        }

        res.status(200).json({
            message: "Station updated successfully."
        });

    } catch (error) {
        console.error("Update station error:", error);

        res.status(500).json({
            message: "Failed to update station."
        });
    }
});

// PATCH /api/admin/stations/:stationId/status
// Change station status
router.patch("/stations/:stationId/status", async (req, res) => {
    try {
        const { stationId } = req.params;
        const { status } = req.body;

        if (!validId(stationId)) {
            return res.status(400).json({
                message: "Invalid station ID."
            });
        }

        if (!STATION_STATUSES.includes(status)) {
            return res.status(400).json({
                message: "Invalid station status.",
                allowedStatuses: STATION_STATUSES
            });
        }

        const [result] = await pool.query(
            `UPDATE charging_station
             SET status = ?
             WHERE station_id = ?`,
            [status, Number(stationId)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Station not found."
            });
        }

        res.status(200).json({
            message: "Station status updated successfully.",
            status
        });

    } catch (error) {
        console.error("Update station status error:", error);

        res.status(500).json({
            message: "Failed to update station status."
        });
    }
});

// GET /api/admin/stations/:stationId/chargers
// View chargers belonging to a station
router.get("/stations/:stationId/chargers", async (req, res) => {
    try {
        const { stationId } = req.params;

        if (!validId(stationId)) {
            return res.status(400).json({
                message: "Invalid station ID."
            });
        }

        const [stations] = await pool.query(
            `SELECT station_id, station_name
             FROM charging_station
             WHERE station_id = ?`,
            [Number(stationId)]
        );

        if (stations.length === 0) {
            return res.status(404).json({
                message: "Station not found."
            });
        }

        const [chargers] = await pool.query(
            `SELECT
                charger_id,
                station_id,
                connector_type,
                power_kw,
                status,
                created_at,
                updated_at
             FROM charger
             WHERE station_id = ?
             ORDER BY charger_id`,
            [Number(stationId)]
        );

        res.status(200).json({
            station: stations[0],
            count: chargers.length,
            chargers
        });

    } catch (error) {
        console.error("Fetch chargers error:", error);

        res.status(500).json({
            message: "Failed to fetch chargers."
        });
    }
});

// POST /api/admin/stations/:stationId/chargers
// Add a charger to a station
router.post("/stations/:stationId/chargers", async (req, res) => {
    try {
        const { stationId } = req.params;
        const { connector_type, power_kw } = req.body;

        if (!validId(stationId)) {
            return res.status(400).json({
                message: "Invalid station ID."
            });
        }

        if (
            !connector_type?.trim() ||
            power_kw === undefined ||
            !Number.isFinite(Number(power_kw)) ||
            Number(power_kw) <= 0
        ) {
            return res.status(400).json({
                message: "Valid connector type and positive power rating are required."
            });
        }

        const [stations] = await pool.query(
            `SELECT station_id
             FROM charging_station
             WHERE station_id = ?`,
            [Number(stationId)]
        );

        if (stations.length === 0) {
            return res.status(404).json({
                message: "Station not found."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO charger
                (station_id, connector_type, power_kw)
             VALUES (?, ?, ?)`,
            [
                Number(stationId),
                connector_type.trim(),
                Number(power_kw)
            ]
        );

        res.status(201).json({
            message: "Charger added successfully.",
            chargerId: result.insertId
        });

    } catch (error) {
        console.error("Add charger error:", error);

        res.status(500).json({
            message: "Failed to add charger."
        });
    }
});

// PUT /api/admin/chargers/:chargerId
// Update charger details
router.put("/chargers/:chargerId", async (req, res) => {
    try {
        const { chargerId } = req.params;
        const { connector_type, power_kw } = req.body;

        if (!validId(chargerId)) {
            return res.status(400).json({
                message: "Invalid charger ID."
            });
        }

        if (
            !connector_type?.trim() ||
            power_kw === undefined ||
            !Number.isFinite(Number(power_kw)) ||
            Number(power_kw) <= 0
        ) {
            return res.status(400).json({
                message: "Valid connector type and positive power rating are required."
            });
        }

        const [result] = await pool.query(
            `UPDATE charger
             SET connector_type = ?, power_kw = ?
             WHERE charger_id = ?`,
            [
                connector_type.trim(),
                Number(power_kw),
                Number(chargerId)
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Charger not found."
            });
        }

        res.status(200).json({
            message: "Charger updated successfully."
        });

    } catch (error) {
        console.error("Update charger error:", error);

        res.status(500).json({
            message: "Failed to update charger."
        });
    }
});

// PATCH /api/admin/chargers/:chargerId/status
// Change charger status
router.patch("/chargers/:chargerId/status", async (req, res) => {
    try {
        const { chargerId } = req.params;
        const { status } = req.body;

        if (!validId(chargerId)) {
            return res.status(400).json({
                message: "Invalid charger ID."
            });
        }

        if (!CHARGER_STATUSES.includes(status)) {
            return res.status(400).json({
                message: "Invalid charger status.",
                allowedStatuses: CHARGER_STATUSES
            });
        }

        const [result] = await pool.query(
            `UPDATE charger
             SET status = ?
             WHERE charger_id = ?`,
            [status, Number(chargerId)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Charger not found."
            });
        }

        res.status(200).json({
            message: "Charger status updated successfully.",
            status
        });

    } catch (error) {
        console.error("Update charger status error:", error);

        res.status(500).json({
            message: "Failed to update charger status."
        });
    }
});

module.exports = router;
