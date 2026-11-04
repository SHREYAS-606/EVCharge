
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// =====================================================
// GET ALL STATIONS
// GET /api/stations
// Includes recommendation, snapshot and forecast data.
// =====================================================

router.get("/", async (req, res) => {
    try {
        const [stations] = await pool.query(`
            SELECT
                cs.station_id,
                cs.station_name,
                cs.address,
                cs.latitude,
                cs.longitude,
                cs.operator,
                cs.opening_time,
                cs.closing_time,
                cs.status,

                COUNT(c.charger_id) AS total_chargers,

                SUM(
                    CASE WHEN c.status = 'AVAILABLE'
                    THEN 1 ELSE 0 END
                ) AS available_chargers,

                SUM(
                    CASE WHEN c.status = 'OCCUPIED'
                    THEN 1 ELSE 0 END
                ) AS occupied_chargers,

                COALESCE(MAX(rv.available_count), 0)
                    AS snapshot_available_count,

                COALESCE(MAX(rv.queue_length), 0)
                    AS queue_length,

                COALESCE(MAX(rv.avg_wait_time), 0)
                    AS avg_wait_time,

                COALESCE(MAX(rv.utilization_rate), 0)
                    AS utilization_rate,

                COALESCE(MAX(rv.predicted_demand), 0)
                    AS predicted_demand,

                COALESCE(MAX(rv.predicted_queue), 0)
                    AS predicted_queue,

                COALESCE(MAX(rv.predicted_wait), 0)
                    AS predicted_wait,

                COALESCE(MAX(rv.price_per_kwh), 0)
                    AS price_per_kwh,

                COALESCE(MAX(rv.average_rating), 0)
                    AS average_rating

            FROM charging_station cs

            LEFT JOIN charger c
                ON cs.station_id = c.station_id

            LEFT JOIN station_recommendation_view rv
                ON c.charger_id = rv.charger_id

            GROUP BY
                cs.station_id,
                cs.station_name,
                cs.address,
                cs.latitude,
                cs.longitude,
                cs.operator,
                cs.opening_time,
                cs.closing_time,
                cs.status

            ORDER BY cs.station_name
        `);

        res.status(200).json(stations);

    } catch (error) {
        console.error("Fetch stations error:", error);

        res.status(500).json({
            message: "Failed to fetch charging stations."
        });
    }
});


// =====================================================
// GET CHARGERS FOR A STATION
// GET /api/stations/:stationId/chargers
// Includes recommendation-related charger information.
// =====================================================

router.get("/:stationId/chargers", async (req, res) => {
    try {
        const stationId = Number(req.params.stationId);

        if (!Number.isInteger(stationId) || stationId <= 0) {
            return res.status(400).json({
                message: "Invalid station ID."
            });
        }

        const [chargers] = await pool.query(`
            SELECT
                c.charger_id,
                c.station_id,
                c.connector_type,
                c.power_kw,
                c.status,

                rv.available_count,
                rv.queue_length,
                rv.avg_wait_time,
                rv.utilization_rate,
                rv.predicted_demand,
                rv.predicted_queue,
                rv.predicted_wait,
                rv.price_per_kwh,
                rv.average_rating

            FROM charger c

            LEFT JOIN station_recommendation_view rv
                ON c.charger_id = rv.charger_id

            WHERE c.station_id = ?

            ORDER BY c.power_kw DESC
        `, [stationId]);

        res.status(200).json(chargers);

    } catch (error) {
        console.error("Fetch station chargers error:", error);

        res.status(500).json({
            message: "Failed to fetch chargers."
        });
    }
});

module.exports = router;
