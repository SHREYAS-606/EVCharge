
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// EXPIRE OLD BOOKINGS
// =====================================================

// Expire bookings whose end time has passed,
// but never expire a booking with an ongoing session.
async function expireOldBookings(db = pool) {
    await db.query(
        `UPDATE booking b
         SET b.status = 'EXPIRED'
         WHERE b.status IN ('PENDING', 'CONFIRMED')
           AND b.booking_end <= NOW()
           AND NOT EXISTS (
               SELECT 1
               FROM charging_session cs
               WHERE cs.booking_id = b.booking_id
                 AND cs.session_status = 'ONGOING'
           )`
    );
}

// =====================================================
// CREATE A NEW BOOKING
// POST /api/bookings
// =====================================================

router.post("/", authMiddleware, async (req, res) => {
    const { chargerId, bookingStart, bookingEnd } = req.body;
    const userId = req.user.userId;

    if (!chargerId || !bookingStart || !bookingEnd) {
        return res.status(400).json({
            message: "Charger, start time and end time are required"
        });
    }

    const start = new Date(bookingStart.replace(" ", "T"));
    const end = new Date(bookingEnd.replace(" ", "T"));

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
    ) {
        return res.status(400).json({
            message: "Please provide valid booking dates and times"
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Expire old bookings before checking availability.
        await expireOldBookings(connection);

        const [chargers] = await connection.query(
            `SELECT
                c.charger_id,
                c.status,
                cs.status AS station_status
             FROM charger c
             JOIN charging_station cs
                ON c.station_id = cs.station_id
             WHERE c.charger_id = ?
             FOR UPDATE`,
            [chargerId]
        );

        if (chargers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Charger not found"
            });
        }

        const charger = chargers[0];

        if (
            charger.status !== "AVAILABLE" ||
            charger.station_status !== "ACTIVE"
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: "This charger is currently unavailable"
            });
        }

        // Check overlapping active bookings.
        const [conflicts] = await connection.query(
            `SELECT booking_id
             FROM booking
             WHERE charger_id = ?
               AND status IN ('PENDING', 'CONFIRMED')
               AND booking_start < ?
               AND booking_end > ?
             LIMIT 1`,
            [chargerId, bookingEnd, bookingStart]
        );

        if (conflicts.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                message: "This charger is already booked during that time"
            });
        }

        const [result] = await connection.query(
            `INSERT INTO booking (
                user_id,
                charger_id,
                booking_start,
                booking_end,
                status
            )
            VALUES (?, ?, ?, ?, 'CONFIRMED')`,
            [userId, chargerId, bookingStart, bookingEnd]
        );

        await connection.commit();

        res.status(201).json({
            message: "Booking created successfully",
            bookingId: result.insertId
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Create booking error:", error);

        if (error.sqlState === "45000") {
            return res.status(409).json({
                message: "This charger is already booked during that time"
            });
        }

        res.status(500).json({
            message: "Failed to create booking"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// =====================================================
// GET MY BOOKINGS
// GET /api/bookings/my
// =====================================================

router.get("/my", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Update expired bookings before returning them.
        await expireOldBookings();

        const [bookings] = await pool.query(
            `SELECT
                b.booking_id,
                b.booking_start,
                b.booking_end,
                b.status,

                c.charger_id,
                c.connector_type,
                c.power_kw,

                cs.station_name,
                cs.address,

                (
                    SELECT charging_session.session_status
                    FROM charging_session
                    WHERE charging_session.booking_id = b.booking_id
                    LIMIT 1
                ) AS session_status

             FROM booking b

             JOIN charger c
                ON b.charger_id = c.charger_id

             JOIN charging_station cs
                ON c.station_id = cs.station_id

             WHERE b.user_id = ?

             ORDER BY b.booking_start DESC`,
            [userId]
        );

        res.json(bookings);

    } catch (error) {
        console.error("Fetch bookings error:", error);

        res.status(500).json({
            message: "Failed to fetch bookings"
        });
    }
});

// =====================================================
// CANCEL A BOOKING
// PATCH /api/bookings/:bookingId/cancel
// =====================================================

router.patch("/:bookingId/cancel", authMiddleware, async (req, res) => {
    let connection;

    try {
        const { bookingId } = req.params;
        const userId = req.user.userId;

        if (!/^[1-9]\d*$/.test(bookingId)) {
            return res.status(400).json({
                message: "Invalid booking ID"
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // First expire overdue bookings.
        await expireOldBookings(connection);

        // Lock and verify booking ownership.
        const [bookings] = await connection.query(
            `SELECT
                booking_id,
                status,
                booking_start,
                booking_end
             FROM booking
             WHERE booking_id = ?
               AND user_id = ?
             FOR UPDATE`,
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        if (
            booking.status !== "PENDING" &&
            booking.status !== "CONFIRMED"
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: "This booking cannot be cancelled"
            });
        }

        if (new Date(booking.booking_start) <= new Date()) {
            await connection.rollback();

            return res.status(400).json({
                message: "A booking that has already started cannot be cancelled"
            });
        }

        const [result] = await connection.query(
            `UPDATE booking
             SET status = 'CANCELLED'
             WHERE booking_id = ?
               AND user_id = ?
               AND status IN ('PENDING', 'CONFIRMED')
               AND booking_start > NOW()
               AND booking_end > NOW()`,
            [bookingId, userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();

            return res.status(409).json({
                message: "Booking could not be cancelled. Please refresh and try again."
            });
        }

        await connection.commit();

        res.json({
            message: "Booking cancelled successfully",
            bookingId: Number(bookingId)
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Cancel booking error:", error);

        res.status(500).json({
            message: "Failed to cancel booking"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
