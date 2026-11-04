
const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.use(authMiddleware, adminMiddleware);

// GET /api/admin/bookings
// Fetch all bookings with optional search and status filter
router.get("/bookings", async (req, res) => {
    try {
        const search = (req.query.search || "").trim();
        const status = (req.query.status || "").trim().toUpperCase();

        const validStatuses = [
            "PENDING",
            "CONFIRMED",
            "COMPLETED",
            "CANCELLED"
        ];

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid booking status."
            });
        }

        let query = `
            SELECT
                b.booking_id,
                b.user_id,
                u.name AS customer_name,
                u.email AS customer_email,
                b.charger_id,
                c.connector_type,
                c.power_kw,
                s.station_id,
                s.station_name,
                s.address AS station_address,
                b.booking_start,
                b.booking_end,
                b.status,
                b.created_at,
                b.updated_at
            FROM booking b
            JOIN users u
                ON b.user_id = u.user_id
            JOIN charger c
                ON b.charger_id = c.charger_id
            JOIN charging_station s
                ON c.station_id = s.station_id
            WHERE 1 = 1
        `;

        const params = [];

        if (search) {
            query += `
                AND (
                    CAST(b.booking_id AS CHAR) LIKE ?
                    OR u.name LIKE ?
                    OR u.email LIKE ?
                    OR s.station_name LIKE ?
                )
            `;

            const searchValue = `%${search}%`;

            params.push(
                searchValue,
                searchValue,
                searchValue,
                searchValue
            );
        }

        if (status) {
            query += " AND b.status = ?";
            params.push(status);
        }

        query += " ORDER BY b.created_at DESC";

        const [bookings] = await pool.query(query, params);

        res.status(200).json({
            count: bookings.length,
            bookings
        });

    } catch (error) {
        console.error("Fetch admin bookings error:", error);

        res.status(500).json({
            message: "Failed to fetch bookings."
        });
    }
});


// GET /api/admin/bookings/:bookingId
// Fetch details of one booking
router.get("/bookings/:bookingId", async (req, res) => {
    try {
        const bookingId = Number(req.params.bookingId);

        if (!Number.isInteger(bookingId) || bookingId <= 0) {
            return res.status(400).json({
                message: "Invalid booking ID."
            });
        }

        const [bookings] = await pool.query(
            `
            SELECT
                b.booking_id,
                b.user_id,
                u.name AS customer_name,
                u.email AS customer_email,
                b.charger_id,
                c.connector_type,
                c.power_kw,
                s.station_id,
                s.station_name,
                s.address AS station_address,
                b.booking_start,
                b.booking_end,
                b.status,
                b.created_at,
                b.updated_at
            FROM booking b
            JOIN users u
                ON b.user_id = u.user_id
            JOIN charger c
                ON b.charger_id = c.charger_id
            JOIN charging_station s
                ON c.station_id = s.station_id
            WHERE b.booking_id = ?
            `,
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                message: "Booking not found."
            });
        }

        res.status(200).json({
            booking: bookings[0]
        });

    } catch (error) {
        console.error("Fetch booking details error:", error);

        res.status(500).json({
            message: "Failed to fetch booking details."
        });
    }
});


// PATCH /api/admin/bookings/:bookingId/cancel
// Cancel a future pending or confirmed booking
router.patch("/bookings/:bookingId/cancel", async (req, res) => {
    try {
        const bookingId = Number(req.params.bookingId);

        if (!Number.isInteger(bookingId) || bookingId <= 0) {
            return res.status(400).json({
                message: "Invalid booking ID."
            });
        }

        const [bookings] = await pool.query(
            `
            SELECT booking_id, status, booking_start
            FROM booking
            WHERE booking_id = ?
            `,
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                message: "Booking not found."
            });
        }

        const booking = bookings[0];

        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
            return res.status(400).json({
                message: "Only pending or confirmed bookings can be cancelled."
            });
        }

        const [result] = await pool.query(
            `
            UPDATE booking
            SET status = 'CANCELLED'
            WHERE booking_id = ?
              AND status IN ('PENDING', 'CONFIRMED')
              AND booking_start > NOW()
            `,
            [bookingId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: "This booking has already started and cannot be cancelled."
            });
        }

        res.status(200).json({
            message: "Booking cancelled successfully.",
            bookingId,
            status: "CANCELLED"
        });

    } catch (error) {
        console.error("Cancel admin booking error:", error);

        res.status(500).json({
            message: "Failed to cancel booking."
        });
    }
});

module.exports = router;
