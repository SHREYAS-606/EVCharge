
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { getMongoDB } = require("../config/mongo");

const router = express.Router();

router.use(authMiddleware);

// POST /api/payments/:paymentId/process
// Body: { outcome: "SUCCESS" } or { outcome: "FAILED" }

router.post("/:paymentId/process", async (req, res) => {
    try {
        const userId = req.user.userId;
        const paymentId = Number(req.params.paymentId);
        const { outcome } = req.body;

        if (!Number.isInteger(paymentId) || paymentId <= 0) {
            return res.status(400).json({
                message: "Invalid payment ID."
            });
        }

        if (!["SUCCESS", "FAILED"].includes(outcome)) {
            return res.status(400).json({
                message: "Outcome must be SUCCESS or FAILED."
            });
        }

        // Verify payment ownership.
        const [payments] = await pool.query(
            `SELECT
                p.payment_id,
                p.session_id,
                p.amount,
                p.payment_method,
                p.transaction_time,
                p.payment_status

             FROM payment p

             JOIN charging_session cs
                ON p.session_id = cs.session_id

             JOIN vehicle v
                ON cs.vehicle_id = v.vehicle_id

             WHERE p.payment_id = ?
               AND v.user_id = ?`,
            [paymentId, userId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                message: "Payment not found."
            });
        }

        const payment = payments[0];

        if (payment.payment_status !== "PENDING") {
            return res.status(400).json({
                message: `Payment has already been processed. Current status: ${payment.payment_status}`
            });
        }

        // Update MySQL payment status.
        const [updateResult] = await pool.query(
            `UPDATE payment
             SET payment_status = ?
             WHERE payment_id = ?
               AND payment_status = 'PENDING'`,
            [outcome, paymentId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(409).json({
                message: "Payment was already processed."
            });
        }

        // Store the simulated transaction and attempt in MongoDB.
        let mongoStored = false;

        try {
            const db = getMongoDB();

            await db.collection("payment_transactions").updateOne(
                { paymentId },
                {
                    $setOnInsert: {
                        paymentId,
                        sessionId: payment.session_id,
                        amount: Number(payment.amount),
                        paymentMethod: payment.payment_method,
                        transactionRef: `EVCHARGE-${paymentId}-${Date.now()}`,
                        createdAt: new Date()
                    },
                    $set: {
                        status: outcome,
                        updatedAt: new Date()
                    },
                    $push: {
                        attempts: {
                            attemptNumber: 1,
                            outcome,
                            simulated: true,
                            attemptedAt: new Date(),
                            message: outcome === "SUCCESS"
                                ? "Simulated payment successful"
                                : "Simulated payment failed"
                        }
                    }
                },
                { upsert: true }
            );

            mongoStored = true;

        } catch (mongoError) {
            console.error("MongoDB transaction error:", mongoError);
        }

        return res.json({
            message: outcome === "SUCCESS"
                ? "Simulated payment successful."
                : "Simulated payment failed.",
            paymentId,
            sessionId: payment.session_id,
            paymentStatus: outcome,
            mongoStored
        });

    } catch (error) {
        console.error("Payment processing error:", error);

        res.status(500).json({
            message: "Failed to process payment."
        });
    }
});

module.exports = router;
