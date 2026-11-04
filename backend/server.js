
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const { connectMongo } = require("./config/mongo");

const stationRoutes = require("./routes/stationRoutes");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminStationRoutes = require("./routes/adminStationRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminBookingRoutes = require("./routes/adminBookingRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "EVCharge API is running"
    });
});

app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS result");

        res.json({
            message: "MySQL connection successful",
            data: rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

app.use("/api/stations", stationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminStationRoutes);
app.use("/api/admin", adminUserRoutes);
app.use("/api/admin", adminBookingRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/payments", paymentRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectMongo();

        app.listen(PORT, () => {
            console.log(`EVCharge server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}

startServer();
