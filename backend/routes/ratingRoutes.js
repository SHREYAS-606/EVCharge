
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get ratings and average rating for a station
router.get("/station/:stationId", async (req, res) => {
    try {
        const stationId = Number(req.params.stationId);

        if (!Number.isInteger(stationId) || stationId <= 0) {
            return res.status(400).json({
                message: "Invalid station ID"
            });
        }

        const [ratings] = await pool.query(
            `SELECT
                sr.rating_id,
                sr.user_id,
                sr.rating,
                sr.review,
                sr.created_at,
                u.name AS customer_name
             FROM station_rating sr
             JOIN users u ON sr.user_id = u.user_id
             WHERE sr.station_id = ?
             ORDER BY sr.created_at DESC`,
            [stationId]
        );

        const [summary] = await pool.query(
            `SELECT
                COUNT(*) AS total_ratings,
                ROUND(AVG(rating), 2) AS average_rating
             FROM station_rating
             WHERE station_id = ?`,
            [stationId]
        );

        res.json({
            stationId,
            totalRatings: Number(summary[0].total_ratings),
            averageRating: summary[0].average_rating === null
                ? null
                : Number(summary[0].average_rating),
            ratings
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch station ratings"
        });
    }
});

// Submit a new rating
router.post("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { stationId, rating, review } = req.body;

        const parsedStationId = Number(stationId);
        const parsedRating = Number(rating);

        if (
            !Number.isInteger(parsedStationId) ||
            parsedStationId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid station ID"
            });
        }

        if (
            !Number.isInteger(parsedRating) ||
            parsedRating < 1 ||
            parsedRating > 5
        ) {
            return res.status(400).json({
                message: "Rating must be an integer between 1 and 5"
            });
        }

        if (
            review !== undefined &&
            (typeof review !== "string" || review.length > 1000)
        ) {
            return res.status(400).json({
                message: "Review must be text with at most 1000 characters"
            });
        }

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

        const [existing] = await pool.query(
            `SELECT rating_id
             FROM station_rating
             WHERE user_id = ? AND station_id = ?`,
            [userId, parsedStationId]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "You have already rated this station. Update your rating instead."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO station_rating
                (user_id, station_id, rating, review)
             VALUES (?, ?, ?, ?)`,
            [
                userId,
                parsedStationId,
                parsedRating,
                review?.trim() || null
            ]
        );

        res.status(201).json({
            message: "Rating submitted successfully",
            ratingId: result.insertId
        });

    } catch (error) {
        console.error(error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "You have already rated this station"
            });
        }

        res.status(500).json({
            message: "Failed to submit rating"
        });
    }
});

// Update an existing rating
router.put("/:ratingId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const ratingId = Number(req.params.ratingId);
        const { rating, review } = req.body;

        const parsedRating = Number(rating);

        if (!Number.isInteger(ratingId) || ratingId <= 0) {
            return res.status(400).json({
                message: "Invalid rating ID"
            });
        }

        if (
            !Number.isInteger(parsedRating) ||
            parsedRating < 1 ||
            parsedRating > 5
        ) {
            return res.status(400).json({
                message: "Rating must be an integer between 1 and 5"
            });
        }

        if (
            review !== undefined &&
            (typeof review !== "string" || review.length > 1000)
        ) {
            return res.status(400).json({
                message: "Review must be text with at most 1000 characters"
            });
        }

        const [result] = await pool.query(
            `UPDATE station_rating
             SET rating = ?, review = ?
             WHERE rating_id = ? AND user_id = ?`,
            [
                parsedRating,
                review?.trim() || null,
                ratingId,
                userId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Rating not found or you do not have permission to update it"
            });
        }

        res.json({
            message: "Rating updated successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update rating"
        });
    }
});

module.exports = router;
