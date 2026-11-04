
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Get all available vehicle models
router.get("/models", async (req, res) => {
    try {
        const [models] = await pool.query(
            `SELECT
                model_id,
                manufacturer,
                model_name,
                battery_capacity_kwh,
                connector_type
             FROM vehicle_model
             ORDER BY manufacturer, model_name`
        );

        res.json({
            count: models.length,
            models
        });

    } catch (error) {
        console.error("Fetch vehicle models error:", error);
        res.status(500).json({
            message: "Failed to fetch vehicle models"
        });
    }
});
// Add a new vehicle model
router.post("/models", async (req, res) => {
    try {
        const {
            manufacturer,
            modelName,
            batteryCapacityKwh,
            connectorType
        } = req.body;

        // Validate required fields
        if (
            !manufacturer?.trim() ||
            !modelName?.trim() ||
            !batteryCapacityKwh ||
            !connectorType?.trim()
        ) {
            return res.status(400).json({
                message: "All vehicle model fields are required."
            });
        }

        const batteryCapacity = Number(batteryCapacityKwh);

        if (!Number.isFinite(batteryCapacity) || batteryCapacity <= 0) {
            return res.status(400).json({
                message: "Battery capacity must be a valid positive number."
            });
        }

        const cleanManufacturer = manufacturer.trim();
        const cleanModelName = modelName.trim();
        const cleanConnectorType = connectorType.trim();

        // Check whether this model already exists
        const [existingModels] = await pool.query(
            `SELECT model_id
             FROM vehicle_model
             WHERE LOWER(manufacturer) = LOWER(?)
             AND LOWER(model_name) = LOWER(?)`,
            [cleanManufacturer, cleanModelName]
        );

        if (existingModels.length > 0) {
            return res.status(409).json({
                message: "This vehicle model already exists.",
                modelId: existingModels[0].model_id
            });
        }

        // Insert the new model
        const [result] = await pool.query(
            `INSERT INTO vehicle_model
             (manufacturer, model_name, battery_capacity_kwh, connector_type)
             VALUES (?, ?, ?, ?)`,
            [
                cleanManufacturer,
                cleanModelName,
                batteryCapacity,
                cleanConnectorType
            ]
        );

        return res.status(201).json({
            message: "Vehicle model added successfully.",
            modelId: result.insertId
        });

    } catch (error) {
        console.error("Add vehicle model error:", error);

        return res.status(500).json({
            message: "Unable to add vehicle model."
        });
    }
});

// Get logged-in user's vehicles
router.get("/my", async (req, res) => {
    try {
        const userId = req.user.userId;

        const [vehicles] = await pool.query(
            `SELECT
                v.vehicle_id,
                v.registration_no,
                v.created_at,
                vm.model_id,
                vm.manufacturer,
                vm.model_name,
                vm.battery_capacity_kwh,
                vm.connector_type
             FROM vehicle v
             JOIN vehicle_model vm
                ON v.model_id = vm.model_id
             WHERE v.user_id = ?
             ORDER BY v.created_at DESC`,
            [userId]
        );

        res.json({
            count: vehicles.length,
            vehicles
        });

    } catch (error) {
        console.error("Fetch vehicles error:", error);
        res.status(500).json({
            message: "Failed to fetch vehicles"
        });
    }
});

// Add a vehicle
router.post("/", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { modelId, registrationNo } = req.body;

        if (!modelId || !registrationNo?.trim()) {
            return res.status(400).json({
                message: "Model and registration number are required"
            });
        }

        const normalizedRegistration = registrationNo.trim().toUpperCase();

        const [models] = await pool.query(
            "SELECT model_id FROM vehicle_model WHERE model_id = ?",
            [modelId]
        );

        if (models.length === 0) {
            return res.status(404).json({
                message: "Vehicle model not found"
            });
        }

        const [existing] = await pool.query(
            "SELECT vehicle_id FROM vehicle WHERE registration_no = ?",
            [normalizedRegistration]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "This registration number is already registered"
            });
        }

        const [result] = await pool.query(
            `INSERT INTO vehicle
                (user_id, model_id, registration_no)
             VALUES (?, ?, ?)`,
            [userId, modelId, normalizedRegistration]
        );

        res.status(201).json({
            message: "Vehicle added successfully",
            vehicleId: result.insertId
        });

    } catch (error) {
        console.error("Add vehicle error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "This registration number is already registered"
            });
        }

        res.status(500).json({
            message: "Failed to add vehicle"
        });
    }
});

// Delete a vehicle
router.delete("/:vehicleId", async (req, res) => {
    try {
        const userId = req.user.userId;
        const vehicleId = Number(req.params.vehicleId);

        if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
            return res.status(400).json({
                message: "Invalid vehicle ID"
            });
        }

        // Do not delete a vehicle with an ongoing charging session
        const [activeSessions] = await pool.query(
            `SELECT session_id
             FROM charging_session
             WHERE vehicle_id = ?
               AND session_status = 'ONGOING'`,
            [vehicleId]
        );

        if (activeSessions.length > 0) {
            return res.status(400).json({
                message: "Cannot delete a vehicle with an active charging session"
            });
        }

        // Delete only the logged-in user's vehicle
        const [result] = await pool.query(
            `DELETE FROM vehicle
             WHERE vehicle_id = ?
               AND user_id = ?`,
            [vehicleId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }

        res.json({
            message: "Vehicle deleted successfully"
        });

    } catch (error) {
        console.error("Delete vehicle error:", error);
        res.status(500).json({
            message: "Failed to delete vehicle"
        });
    }
});

module.exports = router;
