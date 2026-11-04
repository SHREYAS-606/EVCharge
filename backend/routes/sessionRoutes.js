
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { getMongoDB } = require("../config/mongo");

const router = express.Router();

// Apply authentication to all session routes.
router.use(authMiddleware);

// =====================================================
// GET ACTIVE CHARGING SESSIONS
// GET /api/sessions/active
// =====================================================

router.get("/active", async (req, res) => {
    try {
        const userId = req.user.userId;

        const [sessions] = await pool.query(
            `SELECT
                cs.session_id,
                cs.booking_id,
                cs.start_time,
                cs.energy_delivered_kwh,
                cs.session_status,
                cs.cost,

                v.vehicle_id,
                v.registration_no,

                vm.manufacturer,
                vm.model_name,
                vm.battery_capacity_kwh,

                c.charger_id,
                c.connector_type,
                c.power_kw,

                st.station_id,
                st.station_name,
                st.address,

                (
                    SELECT pp.price_per_kwh
                    FROM pricing_plan pp
                    WHERE pp.station_id = st.station_id
                    ORDER BY pp.created_at DESC, pp.pricing_id DESC
                    LIMIT 1
                ) AS price_per_kwh

            FROM charging_session cs

            JOIN vehicle v
                ON cs.vehicle_id = v.vehicle_id

            JOIN vehicle_model vm
                ON v.model_id = vm.model_id

            JOIN charger c
                ON cs.charger_id = c.charger_id

            JOIN charging_station st
                ON c.station_id = st.station_id

            WHERE v.user_id = ?
              AND cs.session_status = 'ONGOING'

            ORDER BY cs.start_time DESC`,
            [userId]
        );

        res.json({
            count: sessions.length,
            sessions
        });

    } catch (error) {
        console.error("Active charging sessions error:", error);

        res.status(500).json({
            message: "Failed to fetch active charging sessions."
        });
    }
});


// =====================================================
// GET CHARGING HISTORY
// GET /api/sessions/history
// =====================================================

router.get("/history", async (req, res) => {
    try {
        const userId = req.user.userId;

        const [sessions] = await pool.query(
            `SELECT
                cs.session_id,
                cs.booking_id,
                cs.start_time,
                cs.end_time,
                cs.energy_delivered_kwh,
                cs.wait_time_minutes,
                cs.session_status,
                cs.cost,

                c.charger_id,
                c.connector_type,
                c.power_kw,

                st.station_id,
                st.station_name,
                st.address,

                p.payment_id,
                p.amount,
                p.payment_method,
                p.transaction_time,
                p.payment_status

            FROM charging_session cs

            JOIN vehicle v
                ON cs.vehicle_id = v.vehicle_id

            JOIN charger c
                ON cs.charger_id = c.charger_id

            JOIN charging_station st
                ON c.station_id = st.station_id

            LEFT JOIN payment p
                ON cs.session_id = p.session_id

            WHERE v.user_id = ?

            ORDER BY cs.start_time DESC`,
            [userId]
        );

        res.json({
            count: sessions.length,
            sessions
        });

    } catch (error) {
        console.error("Charging history error:", error);

        res.status(500).json({
            message: "Failed to fetch charging history"
        });
    }
});


// =====================================================
// START CHARGING
// POST /api/sessions/start
// Body: { bookingId, vehicleId }
// =====================================================

router.post("/start", async (req, res) => {
    let connection;

    try {
        const userId = req.user.userId;
        const { bookingId, vehicleId } = req.body;

        if (
            !Number.isInteger(Number(bookingId)) ||
            Number(bookingId) <= 0 ||
            !Number.isInteger(Number(vehicleId)) ||
            Number(vehicleId) <= 0
        ) {
            return res.status(400).json({
                message: "Valid booking ID and vehicle ID are required."
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check booking ownership and lock the booking.
        const [bookings] = await connection.query(
            `SELECT *
             FROM booking
             WHERE booking_id = ?
               AND user_id = ?
             FOR UPDATE`,
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Booking not found."
            });
        }

        const booking = bookings[0];
        // Automatically expire an unused booking after its end time.
        const [expiredResult] = await connection.query(
            `UPDATE booking
     SET status = 'EXPIRED'
     WHERE booking_id = ?
       AND status IN ('PENDING', 'CONFIRMED')
       AND booking_end <= NOW()
       AND NOT EXISTS (
           SELECT 1
           FROM charging_session cs
           WHERE cs.booking_id = booking.booking_id
             AND cs.session_status = 'ONGOING'
       )`,
            [bookingId]
        );

        if (expiredResult.affectedRows > 0) {
            await connection.commit();

            return res.status(400).json({
                message: "This booking has expired. Please create a new booking."
            });
        }

        if (booking.status !== "CONFIRMED") {
            await connection.rollback();

            return res.status(400).json({
                message: "Only confirmed bookings can start charging."
            });
        }

        // Prevent the same booking from starting more than one session.
        const [existingSessions] = await connection.query(
            `SELECT session_id
             FROM charging_session
             WHERE booking_id = ?
             LIMIT 1`,
            [bookingId]
        );

        if (existingSessions.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                message: "A charging session has already been created for this booking."
            });
        }

        // Check booking time.
        const [activeBookings] = await connection.query(
            `SELECT booking_id
             FROM booking
             WHERE booking_id = ?
               AND booking_start <= NOW()
               AND booking_end > NOW()`,
            [bookingId]
        );

        if (activeBookings.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: "Charging can only start during the booking time."
            });
        }

        // Verify vehicle ownership and get its connector type.
        const [vehicles] = await connection.query(
            `SELECT
                v.vehicle_id,
                vm.connector_type AS vehicle_connector_type
             FROM vehicle v
             JOIN vehicle_model vm
                ON v.model_id = vm.model_id
             WHERE v.vehicle_id = ?
               AND v.user_id = ?`,
            [vehicleId, userId]
        );

        if (vehicles.length === 0) {
            await connection.rollback();

            return res.status(403).json({
                message: "This vehicle does not belong to your account."
            });
        }

        const vehicleConnectorType = String(
            vehicles[0].vehicle_connector_type || ""
        ).trim().toUpperCase();

        // Lock charger and check its status.
        const [chargers] = await connection.query(
            `SELECT
                c.charger_id,
                c.station_id,
                c.power_kw,
                c.connector_type AS charger_connector_type,
                c.status AS charger_status,
                s.status AS station_status

             FROM charger c

             JOIN charging_station s
                ON c.station_id = s.station_id

             WHERE c.charger_id = ?

             FOR UPDATE`,
            [booking.charger_id]
        );

        if (chargers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Charger not found."
            });
        }

        const charger = chargers[0];

        const chargerConnectorType = String(
            charger.charger_connector_type || ""
        ).trim().toUpperCase();

        // Validate connector compatibility.
        if (
            !vehicleConnectorType ||
            !chargerConnectorType ||
            vehicleConnectorType !== chargerConnectorType
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: `Connector mismatch. Your vehicle uses ${vehicleConnectorType || "an unknown connector"}, but this charger supports ${chargerConnectorType || "an unknown connector"}.`
            });
        }

        if (
            charger.charger_status !== "AVAILABLE" ||
            charger.station_status !== "ACTIVE"
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: "Charger or station is currently unavailable."
            });
        }

        // Check station pricing.
        const [pricing] = await connection.query(
            `SELECT price_per_kwh
             FROM pricing_plan
             WHERE station_id = ?
             ORDER BY created_at DESC, pricing_id DESC
             LIMIT 1`,
            [charger.station_id]
        );

        if (pricing.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: "No pricing plan configured for this station."
            });
        }

        // Prevent multiple ongoing sessions on the charger.
        const [ongoingSessions] = await connection.query(
            `SELECT session_id
             FROM charging_session
             WHERE charger_id = ?
               AND session_status = 'ONGOING'
             LIMIT 1`,
            [charger.charger_id]
        );

        if (ongoingSessions.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                message: "This charger already has an ongoing session."
            });
        }

        // Create charging session linked to the booking.
        const [result] = await connection.query(
            `INSERT INTO charging_session (
                booking_id,
                vehicle_id,
                charger_id,
                start_time,
                energy_delivered_kwh,
                wait_time_minutes,
                session_status,
                cost
            )
            VALUES (?, ?, ?, NOW(), 0, 0, 'ONGOING', 0)`,
            [bookingId, vehicleId, charger.charger_id]
        );

        // Mark charger occupied.
        await connection.query(
            `UPDATE charger
             SET status = 'OCCUPIED'
             WHERE charger_id = ?`,
            [charger.charger_id]
        );

        await connection.commit();

        res.status(201).json({
            message: "Charging session started successfully.",
            sessionId: result.insertId,
            bookingId,
            chargerId: charger.charger_id,
            vehicleId,
            pricePerKwh: pricing[0].price_per_kwh,
            status: "ONGOING"
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Start charging error:", error);

        res.status(500).json({
            message: "Failed to start charging."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// =====================================================
// END CHARGING
// PATCH /api/sessions/:sessionId/end
// Body: { paymentMethod }
// =====================================================

router.patch("/:sessionId/end", async (req, res) => {
    let connection;

    try {
        const userId = req.user.userId;
        const sessionId = Number(req.params.sessionId);
        const { paymentMethod } = req.body;

        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            return res.status(400).json({
                message: "Invalid session ID."
            });
        }

        if (
            typeof paymentMethod !== "string" ||
            !paymentMethod.trim() ||
            paymentMethod.trim().length > 50
        ) {
            return res.status(400).json({
                message: "Valid payment method is required."
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Verify session ownership and lock the session.
        const [sessions] = await connection.query(
            `SELECT
                cs.*,
                c.charger_id,
                c.power_kw,
                v.user_id,
                st.station_id

             FROM charging_session cs

             JOIN vehicle v
                ON cs.vehicle_id = v.vehicle_id

             JOIN charger c
                ON cs.charger_id = c.charger_id

             JOIN charging_station st
                ON c.station_id = st.station_id

             WHERE cs.session_id = ?
               AND v.user_id = ?

             FOR UPDATE`,
            [sessionId, userId]
        );

        if (sessions.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Charging session not found."
            });
        }

        const session = sessions[0];

        if (session.session_status !== "ONGOING") {
            await connection.rollback();

            return res.status(400).json({
                message: "This charging session has already ended."
            });
        }

        // Calculate charging duration.
        const [durationRows] = await connection.query(
            `SELECT TIMESTAMPDIFF(
                SECOND,
                start_time,
                NOW()
             ) AS duration_seconds

             FROM charging_session

             WHERE session_id = ?`,
            [sessionId]
        );

        const durationSeconds = Math.max(
            0,
            Number(durationRows[0].duration_seconds)
        );

        // Simulate energy delivered using charger power.
        const energy = Number(
            (
                Number(session.power_kw) *
                durationSeconds / 3600
            ).toFixed(2)
        );

        // Get station price.
        const [pricing] = await connection.query(
            `SELECT price_per_kwh
             FROM pricing_plan
             WHERE station_id = ?
             ORDER BY created_at DESC, pricing_id DESC
             LIMIT 1`,
            [session.station_id]
        );

        if (pricing.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: "No pricing plan found for this station."
            });
        }

        const pricePerKwh = Number(pricing[0].price_per_kwh);

        const cost = Number(
            (energy * pricePerKwh).toFixed(2)
        );

        // Complete the charging session.
        await connection.query(
            `UPDATE charging_session
             SET
                end_time = NOW(),
                energy_delivered_kwh = ?,
                session_status = 'COMPLETED',
                cost = ?

             WHERE session_id = ?`,
            [energy, cost, sessionId]
        );

        // Create payment record in MySQL.
        const [paymentResult] = await connection.query(
            `INSERT INTO payment (
                session_id,
                amount,
                payment_method,
                payment_status
            )
            VALUES (?, ?, ?, 'PENDING')`,
            [sessionId, cost, paymentMethod.trim()]
        );

        const paymentId = paymentResult.insertId;

        // Release charger.
        await connection.query(
            `UPDATE charger
             SET status = 'AVAILABLE'
             WHERE charger_id = ?
               AND status = 'OCCUPIED'`,
            [session.charger_id]
        );

        // Complete the exact booking linked to this charging session.
        if (session.booking_id) {
            await connection.query(
                `UPDATE booking
                 SET status = 'COMPLETED'
                 WHERE booking_id = ?
                   AND user_id = ?
                   AND status = 'CONFIRMED'`,
                [session.booking_id, userId]
            );
        }

        // Commit all MySQL changes first.
        await connection.commit();

        // Store detailed payment transaction in MongoDB.
        let mongoStored = false;

        try {
            const db = getMongoDB();

            await db.collection("payment_transactions").updateOne(
                { paymentId },
                {
                    $setOnInsert: {
                        paymentId,
                        sessionId,
                        amount: cost,
                        paymentMethod: paymentMethod.trim(),
                        status: "PENDING",
                        transactionRef: `EVCHARGE-${paymentId}-${Date.now()}`,
                        createdAt: new Date(),
                        attempts: []
                    }
                },
                { upsert: true }
            );

            mongoStored = true;

        } catch (mongoError) {
            console.error("MongoDB payment storage error:", mongoError);
        }

        res.status(200).json({
            message: "Charging session completed successfully.",
            sessionId,
            paymentId,
            durationSeconds,
            energyDeliveredKwh: energy,
            pricePerKwh,
            totalCost: cost,
            paymentStatus: "PENDING",
            mongoStored,
            sessionStatus: "COMPLETED"
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("End charging error:", error);

        res.status(500).json({
            message: "Failed to end charging session."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});


module.exports = router;
