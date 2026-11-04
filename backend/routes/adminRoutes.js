
const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// GET /api/admin/summary
router.get(
    "/summary",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const [
                [userRows],
                [stationRows],
                [chargerRows],
                [bookingRows],
                [sessionRows],
                [chargerStatuses],
                [bookingStatuses]
            ] = await Promise.all([
                pool.query(
                    "SELECT COUNT(*) AS totalUsers FROM users"
                ),

                pool.query(
                    "SELECT COUNT(*) AS totalStations FROM charging_station"
                ),

                pool.query(
                    "SELECT COUNT(*) AS totalChargers FROM charger"
                ),

                pool.query(
                    "SELECT COUNT(*) AS totalBookings FROM booking"
                ),

                pool.query(
                    "SELECT COUNT(*) AS totalSessions FROM charging_session"
                ),

                pool.query(`
                    SELECT status, COUNT(*) AS count
                    FROM charger
                    GROUP BY status
                `),

                pool.query(`
                    SELECT status, COUNT(*) AS count
                    FROM booking
                    GROUP BY status
                `)
            ]);

            res.status(200).json({
                message: "Admin dashboard summary fetched successfully",

                summary: {
                    totalUsers: userRows[0].totalUsers,
                    totalStations: stationRows[0].totalStations,
                    totalChargers: chargerRows[0].totalChargers,
                    totalBookings: bookingRows[0].totalBookings,
                    totalSessions: sessionRows[0].totalSessions
                },

                chargerStatuses,
                bookingStatuses
            });

        } catch (error) {
            console.error("Admin dashboard error:", error);

            res.status(500).json({
                message: "Failed to fetch admin dashboard summary"
            });
        }
    }
);

module.exports = router;
