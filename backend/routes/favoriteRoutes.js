
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get all favourite stations of the logged-in user
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [favorites] = await pool.query(
            `SELECT
                fs.favorite_id,
                fs.station_id,
                fs.created_at,
                cs.station_name,
                cs.address,
                cs.operator,
                cs.opening_time,
                cs.closing_time,
                cs.status
            FROM favorite_station fs
            JOIN charging_station cs
                ON fs.station_id = cs.station_id
            WHERE fs.user_id = ?
            ORDER BY fs.created_at DESC`,
            [userId]
        );

        res.json({
            count: favorites.length,
            favorites
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch favourite stations"
        });
    }
});

// Add a station to favourites
router.post("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { stationId } = req.body;

        if (
            !Number.isInteger(Number(stationId)) ||
            Number(stationId) <= 0
        ) {
            return res.status(400).json({
                message: "Please provide a valid station ID"
            });
        }

        const parsedStationId = Number(stationId);

        // Check whether the station exists
        const [stations] = await pool.query(
            `SELECT station_id
             FROM charging_station
             WHERE station_id = ?`,
            [parsedStationId]
        );

        if (stations.length === 0) {
            return res.status(404).json({
                message: "Charging station not found"
            });
        }

        // Check whether it is already a favourite
        const [existing] = await pool.query(
            `SELECT favorite_id
             FROM favorite_station
             WHERE user_id = ? AND station_id = ?`,
            [userId, parsedStationId]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Station is already in your favourites"
            });
        }

        const [result] = await pool.query(
            `INSERT INTO favorite_station (user_id, station_id)
             VALUES (?, ?)`,
            [userId, parsedStationId]
        );

        res.status(201).json({
            message: "Station added to favourites successfully",
            favoriteId: result.insertId,
            stationId: parsedStationId
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate entry in case of concurrent requests
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Station is already in your favourites"
            });
        }

        res.status(500).json({
            message: "Failed to add station to favourites"
        });
    }
});

// Remove a station from favourites
router.delete("/:stationId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const stationId = Number(req.params.stationId);

        if (
            !Number.isInteger(stationId) ||
            stationId <= 0
        ) {
            return res.status(400).json({
                message: "Please provide a valid station ID"
            });
        }

        const [result] = await pool.query(
            `DELETE FROM favorite_station
             WHERE user_id = ? AND station_id = ?`,
            [userId, stationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Favourite station not found"
            });
        }

        res.json({
            message: "Station removed from favourites successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to remove favourite station"
        });
    }
});

module.exports = router;
