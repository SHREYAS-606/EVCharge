
const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.use(authMiddleware, adminMiddleware);

// GET /api/admin/users
// Fetch all customers with optional search
router.get("/users", async (req, res) => {
    try {
        const search = (req.query.search || "").trim();

        const [users] = await pool.query(
            `SELECT
                user_id,
                name,
                email,
                role,
                status,
                created_at,
                updated_at
             FROM users
             WHERE name LIKE ?
                OR email LIKE ?
             ORDER BY user_id DESC`,
            [`%${search}%`, `%${search}%`]
        );

        res.status(200).json({
            count: users.length,
            users
        });

    } catch (error) {
        console.error("Fetch admin users error:", error);

        res.status(500).json({
            message: "Failed to fetch users."
        });
    }
});

// GET /api/admin/users/:userId
// Fetch individual user details
router.get("/users/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                message: "Invalid user ID."
            });
        }

        const [users] = await pool.query(
            `SELECT
                user_id,
                name,
                email,
                role,
                status,
                created_at,
                updated_at
             FROM users
             WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.status(200).json({
            user: users[0]
        });

    } catch (error) {
        console.error("Fetch user details error:", error);

        res.status(500).json({
            message: "Failed to fetch user details."
        });
    }
});

// PATCH /api/admin/users/:userId/status
// Activate or deactivate a customer account
router.patch("/users/:userId/status", async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const { status } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                message: "Invalid user ID."
            });
        }

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({
                message: "Status must be ACTIVE or INACTIVE."
            });
        }

        if (userId === Number(req.user.userId)) {
            return res.status(403).json({
                message: "You cannot change your own account status."
            });
        }

        const [users] = await pool.query(
            `SELECT user_id, role
             FROM users
             WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (users[0].role === "ADMIN") {
            return res.status(403).json({
                message: "Admin accounts cannot be modified here."
            });
        }

        const [result] = await pool.query(
            `UPDATE users
             SET status = ?
             WHERE user_id = ?`,
            [status, userId]
        );

        res.status(200).json({
            message: "User status updated successfully.",
            status
        });

    } catch (error) {
        console.error("Update user status error:", error);

        res.status(500).json({
            message: "Failed to update user status."
        });
    }
});

module.exports = router;
