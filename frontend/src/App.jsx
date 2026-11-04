
import { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {
    // Authentication states
    const [isRegister, setIsRegister] = useState(false);
    const [user, setUser] = useState(null);

    // Authentication form states
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Dashboard states
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [chargers, setChargers] = useState([]);
    const [activeView, setActiveView] = useState("stations");

    // Favorites states
    const [favoriteStations, setFavoriteStations] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(false);
    const [favoriteActionId, setFavoriteActionId] = useState(null);

    // Ratings states
    const [ratings, setRatings] = useState([]);
    const [averageRating, setAverageRating] = useState(null);
    const [totalRatings, setTotalRatings] = useState(0);
    const [ratingsLoading, setRatingsLoading] = useState(false);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingValue, setRatingValue] = useState("5");
    const [reviewText, setReviewText] = useState("");

    // Booking states
    const [selectedCharger, setSelectedCharger] = useState(null);
    const [bookingDate, setBookingDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [bookings, setBookings] = useState([]);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [cancellingId, setCancellingId] = useState(null);

    // Charging history states
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);

    // Vehicle states
    const [vehicles, setVehicles] = useState([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [vehicleModels, setVehicleModels] = useState([]);
    const [vehicleModelsLoading, setVehicleModelsLoading] = useState(false);
    const [vehicleForm, setVehicleForm] = useState({ modelId: "", registrationNo: "" });
    const [vehicleSaving, setVehicleSaving] = useState(false);
    const [vehicleDeletingId, setVehicleDeletingId] = useState(null);
    const [isAddingCustomModel, setIsAddingCustomModel] = useState(false);
    const [customModelForm, setCustomModelForm] = useState({
        manufacturer: "",
        modelName: "",
        batteryCapacityKwh: "",
        connectorType: "CCS2"
    });

    // Active charging session states
    const [activeSession, setActiveSession] = useState(null);
    const [activeSessionLoading, setActiveSessionLoading] = useState(false);
    const [chargingActionLoading, setChargingActionLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("UPI");
    const [sessionResult, setSessionResult] = useState(null);

    // General states
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [chargerLoading, setChargerLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const savedToken = () => localStorage.getItem("token");

    // Get today's date
    const getToday = () => {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    // Restore login session
    useEffect(() => {
        const checkSession = async () => {
            const token = savedToken();

            if (!token) {
                setPageLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error("Session expired");
                }

                const data = await response.json();
                setUser(data.user);

            } catch (err) {
                localStorage.removeItem("token");
            } finally {
                setPageLoading(false);
            }
        };

        checkSession();
    }, []);

    // Fetch stations after login
    useEffect(() => {
        if (!user || user.role === "ADMIN") return;

        const fetchStations = async () => {
            try {
                setError("");

                const response = await fetch(`${API_URL}/stations`);

                if (!response.ok) {
                    throw new Error("Unable to fetch stations");
                }

                const data = await response.json();
                setStations(data);

            } catch (err) {
                setError(err.message);
            }
        };

        fetchStations();
    }, [user]);

    // Fetch user's favourites after login
    useEffect(() => {
        if (!user || user.role === "ADMIN") return;

        fetchMyFavorites();
    }, [user]);

    // Fetch vehicles and active charging session after login
    useEffect(() => {
        if (!user || user.role === "ADMIN") return;

        fetchMyVehicles();
        fetchVehicleModels();
        fetchActiveSession();
    }, [user]);

    // Fetch chargers when a station is selected
    useEffect(() => {
        if (!selectedStation) return;

        const fetchChargers = async () => {
            setChargerLoading(true);
            setError("");
            setChargers([]);

            try {
                const response = await fetch(
                    `${API_URL}/stations/${selectedStation.station_id}/chargers`
                );

                if (!response.ok) {
                    throw new Error("Unable to fetch chargers");
                }

                const data = await response.json();
                setChargers(data);

            } catch (err) {
                setError(err.message);
            } finally {
                setChargerLoading(false);
            }
        };

        fetchChargers();
    }, [selectedStation]);

    // Fetch ratings when a station is selected
    useEffect(() => {
        if (!selectedStation) {
            setRatings([]);
            setAverageRating(null);
            setTotalRatings(0);
            setRatingValue("5");
            setReviewText("");
            return;
        }

        fetchStationRatings(selectedStation.station_id);
    }, [selectedStation]);

    // Register or Login
    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setMessage("");
        setError("");

        try {
            if (isRegister) {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message);
                }

                setMessage("Registration successful! Please login.");
                setIsRegister(false);
                setName("");
                setPassword("");

            } else {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Login failed");
                }

                console.log("Logged-in user:", data.user);
                console.log("Logged-in role:", data.user?.role);

                localStorage.setItem("token", data.token);
                setUser(data.user);
                setPassword("");
                setMessage("");
            }

        } catch (err) {
            setMessage(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // Fetch current user's bookings
    const fetchMyBookings = async () => {
        setBookingsLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/bookings/my`, {
                headers: {
                    Authorization: `Bearer ${savedToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to fetch bookings");
            }

            setBookings(data);

        } catch (err) {
            setError(err.message);
        } finally {
            setBookingsLoading(false);
        }
    };

    // Automatically refresh bookings when a booking reaches its end time
    useEffect(() => {
        if (activeView !== "bookings" || bookings.length === 0) {
            return;
        }

        const now = Date.now();

        const futureEndTimes = bookings
            .filter((booking) =>
                ["PENDING", "CONFIRMED"].includes(booking.status)
            )
            .map((booking) => {
                return new Date(
                    String(booking.booking_end).replace(" ", "T")
                ).getTime();
            })
            .filter((endTime) =>
                Number.isFinite(endTime) && endTime > now
            );

        if (futureEndTimes.length === 0) {
            return;
        }

        const nextEndTime = Math.min(...futureEndTimes);

        const timer = setTimeout(() => {
            fetchMyBookings();
        }, nextEndTime - now + 1000);

        return () => clearTimeout(timer);

    }, [activeView, bookings]);

    // Fetch charging history
    const fetchChargingHistory = async () => {
        setSessionsLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/sessions/history`, {
                headers: {
                    Authorization: `Bearer ${savedToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to fetch charging history"
                );
            }

            setSessions(data.sessions || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setSessionsLoading(false);
        }
    };

    // Fetch customer's vehicles
    const fetchMyVehicles = async () => {
        setVehiclesLoading(true);

        try {
            const response = await fetch(`${API_URL}/vehicles/my`, {
                headers: {
                    Authorization: `Bearer ${savedToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to fetch vehicles");
            }

            setVehicles(data.vehicles || []);

            if (data.vehicles?.length > 0) {
                setSelectedVehicleId((previous) =>
                    previous || String(data.vehicles[0].vehicle_id)
                );
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setVehiclesLoading(false);
        }
    };

    // Fetch available vehicle models
    const fetchVehicleModels = async () => {
        setVehicleModelsLoading(true);
        try {
            const response = await fetch(`${API_URL}/vehicles/models`, {
                headers: { Authorization: `Bearer ${savedToken()}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to fetch vehicle models");
            setVehicleModels(data.models || []);
            if (data.models?.length) {
                setVehicleForm((previous) => ({
                    ...previous,
                    modelId: previous.modelId || String(data.models[0].model_id)
                }));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setVehicleModelsLoading(false);
        }
    };

    // Add a vehicle using an existing model or create a new shared model first
    const handleAddVehicle = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        const registrationNo = vehicleForm.registrationNo.trim().toUpperCase();

        if (!registrationNo) {
            setError("Enter your vehicle registration number.");
            return;
        }

        if (!isAddingCustomModel && !vehicleForm.modelId) {
            setError("Please select a vehicle model.");
            return;
        }

        if (isAddingCustomModel) {
            const capacity = Number(customModelForm.batteryCapacityKwh);

            if (
                !customModelForm.manufacturer.trim() ||
                !customModelForm.modelName.trim() ||
                !customModelForm.batteryCapacityKwh ||
                !customModelForm.connectorType.trim()
            ) {
                setError("Please fill in all vehicle model details.");
                return;
            }

            if (!Number.isFinite(capacity) || capacity <= 0) {
                setError("Battery capacity must be a positive number.");
                return;
            }
        }

        setVehicleSaving(true);

        try {
            let modelId = vehicleForm.modelId;

            // Create the model first when the customer adds a custom model
            if (isAddingCustomModel) {
                const modelResponse = await fetch(`${API_URL}/vehicles/models`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${savedToken()}`
                    },
                    body: JSON.stringify({
                        manufacturer: customModelForm.manufacturer.trim(),
                        modelName: customModelForm.modelName.trim(),
                        batteryCapacityKwh: Number(customModelForm.batteryCapacityKwh),
                        connectorType: customModelForm.connectorType.trim()
                    })
                });

                const modelData = await modelResponse.json();

                // If the model already exists, reuse its ID rather than creating a duplicate
                if (modelResponse.status === 409 && modelData.modelId) {
                    modelId = String(modelData.modelId);
                } else if (!modelResponse.ok) {
                    throw new Error(modelData.message || "Unable to add vehicle model.");
                } else {
                    modelId = String(modelData.modelId);
                }
            }

            if (!modelId) {
                throw new Error("Please select or add a vehicle model.");
            }

            const vehicleResponse = await fetch(`${API_URL}/vehicles`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${savedToken()}`
                },
                body: JSON.stringify({
                    modelId: Number(modelId),
                    registrationNo
                })
            });

            const vehicleData = await vehicleResponse.json();

            if (!vehicleResponse.ok) {
                throw new Error(vehicleData.message || "Unable to add vehicle.");
            }

            setVehicleForm({ modelId: "", registrationNo: "" });
            setCustomModelForm({
                manufacturer: "",
                modelName: "",
                batteryCapacityKwh: "",
                connectorType: "CCS2"
            });
            setIsAddingCustomModel(false);

            await Promise.all([fetchVehicleModels(), fetchMyVehicles()]);
            setMessage("Vehicle added successfully.");
        } catch (err) {
            setError(err.message || "Unable to add vehicle.");
        } finally {
            setVehicleSaving(false);
        }
    };

    // Delete a vehicle
    const handleDeleteVehicle = async (vehicleId) => {
        const confirmed = window.confirm("Are you sure you want to delete this vehicle?");
        if (!confirmed) return;
        setError("");
        setMessage("");
        setVehicleDeletingId(vehicleId);
        try {
            const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${savedToken()}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to delete vehicle");
            setVehicles((previous) => previous.filter((vehicle) => vehicle.vehicle_id !== vehicleId));
            if (String(selectedVehicleId) === String(vehicleId)) {
                const nextVehicle = vehicles.find((vehicle) => vehicle.vehicle_id !== vehicleId);
                setSelectedVehicleId(nextVehicle ? String(nextVehicle.vehicle_id) : "");
            }
            setMessage("Vehicle deleted successfully.");
        } catch (err) {
            setError(err.message);
        } finally {
            setVehicleDeletingId(null);
        }
    };

    // Open My Vehicles
    const handleMyVehicles = async () => {
        setActiveView("vehicles");
        setSelectedStation(null);
        setSelectedCharger(null);
        setMessage("");
        setError("");
        await Promise.all([fetchMyVehicles(), fetchVehicleModels()]);
    };

    // Fetch ongoing charging session
    const fetchActiveSession = async () => {
        setActiveSessionLoading(true);

        try {
            const response = await fetch(`${API_URL}/sessions/active`, {
                headers: {
                    Authorization: `Bearer ${savedToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to fetch active session"
                );
            }

            setActiveSession(data.sessions?.[0] || null);

        } catch (err) {
            setError(err.message);
        } finally {
            setActiveSessionLoading(false);
        }
    };

    // Start charging
    const handleStartCharging = async (bookingId) => {
        setError("");
        setMessage("");
        setSessionResult(null);

        if (!selectedVehicleId) {
            setError("Please select a vehicle first.");
            return;
        }

        if (activeSession) {
            setError("You already have an active charging session.");
            return;
        }

        setChargingActionLoading(true);

        try {
            const response = await fetch(`${API_URL}/sessions/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${savedToken()}`
                },
                body: JSON.stringify({
                    bookingId: Number(bookingId),
                    vehicleId: Number(selectedVehicleId)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to start charging");
            }

            setMessage("Charging session started successfully!");

            await fetchActiveSession();
            await fetchMyBookings();

            // Refresh station and charger information
            if (selectedStation) {
                const stationResponse = await fetch(
                    `${API_URL}/stations/${selectedStation.station_id}/chargers`
                );

                if (stationResponse.ok) {
                    const chargerData = await stationResponse.json();
                    setChargers(chargerData);
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setChargingActionLoading(false);
        }
    };

    // End charging
    const handleEndCharging = async () => {
        if (!activeSession) return;

        const confirmed = window.confirm(
            "Are you sure you want to end this charging session?"
        );

        if (!confirmed) return;

        setError("");
        setMessage("");
        setChargingActionLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/sessions/${activeSession.session_id}/end`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${savedToken()}`
                    },
                    body: JSON.stringify({
                        paymentMethod
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to end charging");
            }

            setSessionResult(data);
            setActiveSession(null);

            setMessage("Charging session completed successfully!");

            await fetchChargingHistory();
            await fetchMyBookings();

            // Refresh charger information if a station is selected
            if (selectedStation) {
                const stationResponse = await fetch(
                    `${API_URL}/stations/${selectedStation.station_id}/chargers`
                );

                if (stationResponse.ok) {
                    const chargerData = await stationResponse.json();
                    setChargers(chargerData);
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setChargingActionLoading(false);
        }
    };

    // Process simulated payment
    const handleProcessPayment = async (outcome) => {
        if (!sessionResult?.paymentId) return;

        setError("");
        setMessage("");
        setChargingActionLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/payments/${sessionResult.paymentId}/process`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${savedToken()}`
                    },
                    body: JSON.stringify({ outcome })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Payment processing failed.");
            }

            setSessionResult((previous) => ({
                ...previous,
                paymentStatus: data.paymentStatus
            }));

            setMessage(
                `${data.message} MongoDB storage: ${data.mongoStored ? "successful" : "pending"
                }`
            );

            await fetchChargingHistory();

        } catch (err) {
            setError(err.message);
        } finally {
            setChargingActionLoading(false);
        }
    };

    // Fetch favourites
    const fetchMyFavorites = async () => {
        setFavoritesLoading(true);

        try {
            const response = await fetch(`${API_URL}/favorites/my`, {
                headers: {
                    Authorization: `Bearer ${savedToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to fetch favourites"
                );
            }

            setFavoriteStations(data.favorites || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setFavoritesLoading(false);
        }
    };

    // Check whether a station is a favourite
    const isFavorite = (stationId) => {
        return favoriteStations.some(
            (station) => Number(station.station_id) === Number(stationId)
        );
    };

    // Add or remove a favourite
    const handleToggleFavorite = async (stationId) => {
        setError("");
        setMessage("");
        setFavoriteActionId(stationId);

        try {
            const alreadyFavorite = isFavorite(stationId);

            const response = await fetch(
                alreadyFavorite
                    ? `${API_URL}/favorites/${stationId}`
                    : `${API_URL}/favorites`,
                {
                    method: alreadyFavorite ? "DELETE" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${savedToken()}`
                    },
                    ...(alreadyFavorite
                        ? {}
                        : {
                            body: JSON.stringify({ stationId })
                        })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update favourites"
                );
            }

            if (alreadyFavorite) {
                setFavoriteStations((previous) =>
                    previous.filter(
                        (station) =>
                            Number(station.station_id) !== Number(stationId)
                    )
                );

                setMessage("Station removed from favourites.");

            } else {
                const station = stations.find(
                    (item) => Number(item.station_id) === Number(stationId)
                );

                if (station) {
                    setFavoriteStations((previous) => [
                        {
                            ...station,
                            station_id: stationId,
                            created_at: new Date().toISOString()
                        },
                        ...previous
                    ]);
                }

                setMessage("Station added to favourites.");
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setFavoriteActionId(null);
        }
    };

    // Open My Favorites
    const handleMyFavorites = async () => {
        setActiveView("favorites");
        setSelectedStation(null);
        setSelectedCharger(null);
        setMessage("");
        setError("");

        await fetchMyFavorites();
    };

    // Fetch ratings for a station
    const fetchStationRatings = async (stationId) => {
        setRatingsLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/ratings/station/${stationId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to fetch station ratings"
                );
            }

            setRatings(data.ratings || []);
            setAverageRating(data.averageRating);
            setTotalRatings(data.totalRatings || 0);

            const ownRating = (data.ratings || []).find(
                (item) =>
                    Number(item.user_id) === Number(user?.user_id)
            );

            if (ownRating) {
                setRatingValue(String(ownRating.rating));
                setReviewText(ownRating.review || "");
            } else {
                setRatingValue("5");
                setReviewText("");
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setRatingsLoading(false);
        }
    };

    // Submit or update a station rating
    const handleRatingSubmit = async (e) => {
        e.preventDefault();

        if (!selectedStation) return;

        setRatingSubmitting(true);
        setError("");
        setMessage("");

        try {
            const ownRating = ratings.find(
                (item) =>
                    Number(item.user_id) === Number(user?.user_id)
            );

            const url = ownRating
                ? `${API_URL}/ratings/${ownRating.rating_id}`
                : `${API_URL}/ratings`;

            const response = await fetch(url, {
                method: ownRating ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${savedToken()}`
                },
                body: JSON.stringify(
                    ownRating
                        ? {
                            rating: Number(ratingValue),
                            review: reviewText
                        }
                        : {
                            stationId: selectedStation.station_id,
                            rating: Number(ratingValue),
                            review: reviewText
                        }
                )
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to submit rating"
                );
            }

            setMessage(
                ownRating
                    ? "Your rating has been updated successfully."
                    : "Your rating has been submitted successfully."
            );

            await fetchStationRatings(selectedStation.station_id);

        } catch (err) {
            setError(err.message);
        } finally {
            setRatingSubmitting(false);
        }
    };

    // Open My Bookings
    const handleMyBookings = async () => {
        setActiveView("bookings");
        setSelectedStation(null);
        setSelectedCharger(null);
        setMessage("");
        setError("");

        await fetchMyBookings();
    };

    // Open Charging History
    const handleChargingHistory = async () => {
        setActiveView("history");
        setSelectedStation(null);
        setSelectedCharger(null);
        setMessage("");
        setError("");

        await fetchChargingHistory();
    };

    // Open stations section
    const handleStations = () => {
        setActiveView("stations");
        setSelectedStation(null);
        setSelectedCharger(null);
        setError("");
        setMessage("");
    };

    // Open booking form
    const handleOpenBooking = (charger) => {
        setSelectedCharger(charger);
        setBookingDate("");
        setStartTime("");
        setEndTime("");
        setMessage("");
        setError("");
    };

    // Create a booking
    const handleBookingSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        if (!bookingDate || !startTime || !endTime) {
            setError("Please select a date, start time and end time.");
            return;
        }

        const start = new Date(`${bookingDate}T${startTime}:00`);
        const end = new Date(`${bookingDate}T${endTime}:00`);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            setError("Please select valid booking times.");
            return;
        }

        if (start <= new Date()) {
            setError("Booking start time must be in the future.");
            return;
        }

        if (end <= start) {
            setError("End time must be later than start time.");
            return;
        }

        setBookingLoading(true);

        try {
            const response = await fetch(`${API_URL}/bookings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${savedToken()}`
                },
                body: JSON.stringify({
                    chargerId: selectedCharger.charger_id,
                    bookingStart: `${bookingDate} ${startTime}:00`,
                    bookingEnd: `${bookingDate} ${endTime}:00`
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Booking failed");
            }

            setMessage(
                `Booking successful! Your booking ID is ${data.bookingId}.`
            );

            setSelectedCharger(null);

        } catch (err) {
            setError(err.message);
        } finally {
            setBookingLoading(false);
        }
    };

    // Cancel a booking
    const handleCancelBooking = async (bookingId) => {
        const confirmed = window.confirm(
            "Are you sure you want to cancel this booking?"
        );

        if (!confirmed) return;

        setError("");
        setMessage("");
        setCancellingId(bookingId);

        try {
            const response = await fetch(
                `${API_URL}/bookings/${bookingId}/cancel`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${savedToken()}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Cancellation failed");
            }

            setMessage("Booking cancelled successfully!");

            await fetchMyBookings();

        } catch (err) {
            setError(err.message);
        } finally {
            setCancellingId(null);
        }
    };

    // Format date and time
    const formatDateTime = (value) => {
        if (!value) return "Not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString();
    };

    // Check whether a booking has expired
    const isBookingExpired = (booking) => {
        if (
            booking.status !== "CONFIRMED" &&
            booking.status !== "PENDING"
        ) {
            return booking.status === "EXPIRED";
        }

        // Do not expire a booking that has an ongoing charging session
        if (booking.session_status === "ONGOING") {
            return false;
        }

        const endTime = new Date(
            String(booking.booking_end).replace(" ", "T")
        ).getTime();

        return Number.isFinite(endTime) && endTime <= Date.now();
    };

    // Format currency
    const formatCurrency = (value) => {
        if (value === null || value === undefined) {
            return "Not available";
        }

        return `₹${Number(value).toFixed(2)}`;
    };

    // Logout
    const handleLogout = () => {
        localStorage.removeItem("token");

        setUser(null);
        setStations([]);
        setSelectedStation(null);
        setChargers([]);
        setBookings([]);
        setSessions([]);
        setFavoriteStations([]);
        setRatings([]);
        setSelectedCharger(null);
        setActiveView("stations");
        setVehicles([]);
        setVehicleModels([]);
        setVehicleForm({ modelId: "", registrationNo: "" });
        setIsAddingCustomModel(false);
        setCustomModelForm({
            manufacturer: "",
            modelName: "",
            batteryCapacityKwh: "",
            connectorType: "CCS2"
        });
        setSelectedVehicleId("");
        setActiveSession(null);
        setSessionResult(null);
        setPaymentMethod("UPI");
        setEmail("");
        setPassword("");
        setName("");
        setMessage("");
        setError("");
    };

    // Reusable station card
    const renderStationCard = (station) => (
        <div className="station-card" key={station.station_id}>

            <h3>{station.station_name}</h3>

            <p>{station.address}</p>
            <p>Operator: {station.operator}</p>

            <p>Total Chargers: {station.total_chargers ?? 0}</p>
            <p>Available: {station.available_chargers ?? 0}</p>
            <p>Occupied: {station.occupied_chargers ?? 0}</p>

            <hr />

            <h4>Station Information</h4>

            <p>
                Snapshot Available Chargers:{" "}
                {station.snapshot_available_count ?? 0}
            </p>

            <p>
                Utilization:{" "}
                {Number(station.utilization_rate ?? 0).toFixed(2)}%
            </p>

           

           

            <h4>Demand Forecast</h4>

            <p>
                Predicted Demand: {station.predicted_demand ?? 0}
            </p>

            <p>
                Predicted Queue: {station.predicted_queue ?? 0}
            </p>


            <h4>Pricing and Rating</h4>

            <p>
                Price: {formatCurrency(station.price_per_kwh)} / kWh
            </p>

            <p>
                Average Rating:{" "}
                {Number(station.average_rating ?? 0).toFixed(1)} / 5
            </p>

            <span className="status">
                {station.status}
            </span>

            <div className="station-card-actions">

                <button
                    className="view-button"
                    onClick={() => {
                        setActiveView("stations");
                        setSelectedStation(station);
                        setSelectedCharger(null);
                        setMessage("");
                        setError("");
                    }}
                >
                    View Details
                </button>

                <button
                    className={
                        isFavorite(station.station_id)
                            ? "favorite-button favorited"
                            : "favorite-button"
                    }
                    onClick={() =>
                        handleToggleFavorite(station.station_id)
                    }
                    disabled={favoriteActionId === station.station_id}
                >
                    {favoriteActionId === station.station_id
                        ? "Please wait..."
                        : isFavorite(station.station_id)
                            ? "♥ Remove Favorite"
                            : "♡ Add Favorite"}
                </button>

            </div>

        </div>
    );

    // Loading screen
    if (pageLoading) {
        return (
            <div className="auth-container">
                <h2>Loading EVCharge...</h2>
            </div>
        );
    }

    // Login and Registration page
    if (!user) {
        return (
            <div className="auth-container">
                <div className="auth-card">

                    <h1>⚡ EVCharge</h1>

                    <p className="subtitle">
                        Your smart EV charging platform
                    </p>

                    <h2>
                        {isRegister ? "Create Account" : "Welcome Back"}
                    </h2>

                    <form onSubmit={handleSubmit}>

                        {isRegister && (
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        )}

                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={8}
                            required
                        />

                        <button type="submit" disabled={loading}>
                            {loading
                                ? "Please wait..."
                                : isRegister
                                    ? "Register"
                                    : "Login"}
                        </button>

                    </form>

                    {message && (
                        <p className="message">{message}</p>
                    )}

                    <p className="switch-text">
                        {isRegister
                            ? "Already have an account?"
                            : "Don't have an account?"}

                        <button
                            className="switch-button"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setMessage("");
                            }}
                        >
                            {isRegister ? "Login" : "Register"}
                        </button>
                    </p>

                </div>
            </div>
        );
    }

    // Admin Dashboard
    if (String(user.role || "").trim().toUpperCase() === "ADMIN") {
        return (
            <AdminDashboard
                user={user}
                token={savedToken()}
                onLogout={handleLogout}
            />
        );
    }

    // Customer Dashboard
    return (
        <div className="dashboard">

            <header className="navbar">

                <h1>⚡ EVCharge</h1>

                <div className="navbar-right">

                    <span>Welcome, {user.name}</span>

                    <button
                        className="nav-button"
                        onClick={handleStations}
                    >
                        Stations
                    </button>

                    <button
                        className="nav-button"
                        onClick={handleMyFavorites}
                    >
                        My Favorites
                    </button>

                    <button
                        className="nav-button"
                        onClick={handleMyBookings}
                    >
                        My Bookings
                    </button>

                    <button
                        className="nav-button"
                        onClick={handleChargingHistory}
                    >
                        Charging History
                    </button>

                    <button
                        className="nav-button"
                        onClick={handleMyVehicles}
                    >
                        My Vehicles
                    </button>

                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>

            <main>

                {error && (
                    <p className="error-message">{error}</p>
                )}

                {message && (
                    <p className="message">{message}</p>
                )}

                {/* Active Charging Session */}
                {activeSessionLoading ? (
                    <p>Checking active charging session...</p>
                ) : activeSession ? (

                    <div className="station-card active-session-card">

                        <h2>⚡ Charging In Progress</h2>

                        <span className="status">ONGOING</span>

                        <h3>{activeSession.station_name}</h3>

                        <p>{activeSession.address}</p>

                        <div className="history-details">

                            <p>Session ID: #{activeSession.session_id}</p>

                            <p>
                                Vehicle: {activeSession.manufacturer}{" "}
                                {activeSession.model_name}
                            </p>

                            <p>
                                Registration: {activeSession.registration_no}
                            </p>

                            <p>Charger: #{activeSession.charger_id}</p>

                            <p>Connector: {activeSession.connector_type}</p>

                            <p>Power: {activeSession.power_kw} kW</p>

                            <p>
                                Started: {formatDateTime(activeSession.start_time)}
                            </p>

                            <p>
                                Price: {formatCurrency(activeSession.price_per_kwh)} / kWh
                            </p>

                        </div>

                        <label>Payment Method</label>

                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            disabled={chargingActionLoading}
                        >
                            <option value="UPI">UPI</option>
                            <option value="CARD">Card</option>
                            <option value="CASH">Cash</option>
                        </select>

                        <button
                            className="cancel-button"
                            onClick={handleEndCharging}
                            disabled={chargingActionLoading}
                        >
                            {chargingActionLoading
                                ? "Ending Session..."
                                : "End Charging"}
                        </button>

                    </div>

                ) : null}

                {/* Completed Session Result */}
                {sessionResult && (

                    <div className="station-card">

                        <h2>Charging Summary</h2>

                        <span className="status">COMPLETED</span>

                        <p>Session ID: #{sessionResult.sessionId}</p>

                        <p>
                            Duration:{" "}
                            {Math.floor(sessionResult.durationSeconds / 60)} minutes{" "}
                            {sessionResult.durationSeconds % 60} seconds
                        </p>

                        <p>
                            Energy Delivered:{" "}
                            {sessionResult.energyDeliveredKwh} kWh
                        </p>

                        <p>
                            Price per kWh:{" "}
                            {formatCurrency(sessionResult.pricePerKwh)}
                        </p>

                        <h3>
                            Total Cost: {formatCurrency(sessionResult.totalCost)}
                        </h3>

                        <p>
                            Payment Status: {sessionResult.paymentStatus}
                        </p>

                        <p>
                            Payment Method: {paymentMethod}
                        </p>

                        {sessionResult.paymentStatus === "PENDING" && (
                            <div>
                                <h3>Simulated Payment</h3>

                                <button
                                    className="view-button"
                                    onClick={() => handleProcessPayment("SUCCESS")}
                                    disabled={chargingActionLoading}
                                >
                                    Simulate Payment Success
                                </button>

                                <button
                                    className="cancel-button"
                                    onClick={() => handleProcessPayment("FAILED")}
                                    disabled={chargingActionLoading}
                                >
                                    Simulate Payment Failure
                                </button>
                            </div>
                        )}

                        <button
                            className="view-button"
                            onClick={handleChargingHistory}
                        >
                            View Charging History
                        </button>

                    </div>

                )}

                {/* My Vehicles Page */}
                {activeView === "vehicles" ? (
                    <section className="vehicles-section">
                        <h2>My Vehicles</h2>
                        <p>Manage the electric vehicles registered to your account.</p>

                        <div className="station-card vehicle-form-card">
                            <h3>Add a Vehicle</h3>

                            <form className="booking-form" onSubmit={handleAddVehicle}>
                                <label>Vehicle Model Option</label>

                                <div
                                    className="vehicle-model-options"
                                    style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}
                                >
                                    <button
                                        type="button"
                                        className={!isAddingCustomModel ? "booking-button" : "view-button"}
                                        onClick={() => {
                                            setIsAddingCustomModel(false);
                                            setError("");
                                            setMessage("");
                                        }}
                                    >
                                        Select Existing Model
                                    </button>

                                    <button
                                        type="button"
                                        className={isAddingCustomModel ? "booking-button" : "view-button"}
                                        onClick={() => {
                                            setIsAddingCustomModel(true);
                                            setError("");
                                            setMessage("");
                                        }}
                                    >
                                        Add New Model
                                    </button>
                                </div>

                                {!isAddingCustomModel ? (
                                    <>
                                        <label htmlFor="vehicleModel">Select Vehicle Model</label>
                                        <select
                                            id="vehicleModel"
                                            value={vehicleForm.modelId}
                                            onChange={(e) =>
                                                setVehicleForm((previous) => ({
                                                    ...previous,
                                                    modelId: e.target.value
                                                }))
                                            }
                                            required
                                        >
                                            <option value="">Choose a vehicle model</option>
                                            {vehicleModels.map((model) => (
                                                <option
                                                    key={model.model_id}
                                                    value={model.model_id}
                                                >
                                                    {model.manufacturer} {model.model_name}
                                                    {" "}({model.battery_capacity_kwh} kWh, {model.connector_type})
                                                </option>
                                            ))}
                                        </select>

                                        {!vehicleModelsLoading && vehicleModels.length === 0 && (
                                            <p>No existing models are available. Select "Add New Model" to register one.</p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <h4>New Vehicle Model Details</h4>

                                        <label htmlFor="customManufacturer">Manufacturer</label>
                                        <input
                                            id="customManufacturer"
                                            type="text"
                                            placeholder="e.g. Mahindra"
                                            value={customModelForm.manufacturer}
                                            onChange={(e) =>
                                                setCustomModelForm((previous) => ({
                                                    ...previous,
                                                    manufacturer: e.target.value
                                                }))
                                            }
                                            maxLength={100}
                                            required
                                        />

                                        <label htmlFor="customModelName">Model Name</label>
                                        <input
                                            id="customModelName"
                                            type="text"
                                            placeholder="e.g. BE 6"
                                            value={customModelForm.modelName}
                                            onChange={(e) =>
                                                setCustomModelForm((previous) => ({
                                                    ...previous,
                                                    modelName: e.target.value
                                                }))
                                            }
                                            maxLength={100}
                                            required
                                        />

                                        <label htmlFor="customBatteryCapacity">Battery Capacity (kWh)</label>
                                        <input
                                            id="customBatteryCapacity"
                                            type="number"
                                            placeholder="e.g. 59"
                                            min="0.01"
                                            step="0.01"
                                            value={customModelForm.batteryCapacityKwh}
                                            onChange={(e) =>
                                                setCustomModelForm((previous) => ({
                                                    ...previous,
                                                    batteryCapacityKwh: e.target.value
                                                }))
                                            }
                                            required
                                        />

                                        <label htmlFor="customConnectorType">Connector Type</label>
                                        <select
                                            id="customConnectorType"
                                            value={customModelForm.connectorType}
                                            onChange={(e) =>
                                                setCustomModelForm((previous) => ({
                                                    ...previous,
                                                    connectorType: e.target.value
                                                }))
                                            }
                                            required
                                        >
                                            <option value="CCS2">CCS2</option>
                                            <option value="Type 2">Type 2</option>
                                            <option value="CHAdeMO">CHAdeMO</option>
                                            <option value="GB/T">GB/T</option>
                                        </select>
                                    </>
                                )}

                                <label htmlFor="registrationNo">Registration Number</label>
                                <input
                                    id="registrationNo"
                                    type="text"
                                    placeholder="e.g. KA03CD4567"
                                    value={vehicleForm.registrationNo}
                                    onChange={(e) =>
                                        setVehicleForm((previous) => ({
                                            ...previous,
                                            registrationNo: e.target.value.toUpperCase()
                                        }))
                                    }
                                    maxLength={50}
                                    required
                                />

                                <button
                                    type="submit"
                                    className="booking-button"
                                    disabled={vehicleSaving || vehicleModelsLoading}
                                >
                                    {vehicleSaving ? "Adding Vehicle..." : "Add Vehicle"}
                                </button>
                            </form>
                        </div>

                        <h3>Registered Vehicles</h3>
                        {vehiclesLoading ? (
                            <p>Loading your vehicles...</p>
                        ) : vehicles.length === 0 ? (
                            <div className="history-empty">
                                <h3>No Vehicles Registered</h3>
                                <p>Add your EV using the form above.</p>
                            </div>
                        ) : (
                            <div className="station-grid">
                                {vehicles.map((vehicle) => (
                                    <div className="station-card vehicle-card" key={vehicle.vehicle_id}>
                                        <h3>{vehicle.manufacturer} {vehicle.model_name}</h3>
                                        <p>Registration: {vehicle.registration_no}</p>
                                        <p>Battery Capacity: {vehicle.battery_capacity_kwh} kWh</p>
                                        <p>Connector Type: {vehicle.connector_type}</p>
                                        <p>Vehicle ID: #{vehicle.vehicle_id}</p>
                                        <button
                                            className="cancel-button"
                                            onClick={() => handleDeleteVehicle(vehicle.vehicle_id)}
                                            disabled={vehicleDeletingId === vehicle.vehicle_id || (activeSession && Number(activeSession.vehicle_id) === Number(vehicle.vehicle_id))}
                                        >
                                            {vehicleDeletingId === vehicle.vehicle_id ? "Deleting..." : "Delete Vehicle"}
                                        </button>
                                        {activeSession && Number(activeSession.vehicle_id) === Number(vehicle.vehicle_id) && (
                                            <p>This vehicle is currently being used for an active charging session.</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button className="back-button" onClick={handleStations}>
                            ← Back to Stations
                        </button>
                    </section>

                ) : activeView === "history" ? (

                    <section>

                        <h2>Charging History</h2>

                        <p>
                            View your previous charging sessions and payment details.
                        </p>

                        {sessionsLoading && (
                            <p>Loading your charging history...</p>
                        )}

                        {!sessionsLoading &&
                            sessions.length === 0 &&
                            !error && (
                                <div className="history-empty">
                                    <h3>No Charging Sessions Yet</h3>
                                    <p>
                                        Your completed charging sessions will
                                        appear here.
                                    </p>
                                </div>
                            )}

                        <div className="station-grid">

                            {!sessionsLoading && sessions.map((session) => (

                                <div
                                    className="station-card history-card"
                                    key={session.session_id}
                                >

                                    <h3>{session.station_name}</h3>

                                    <p>{session.address}</p>

                                    <div className="history-details">

                                        <h4>Session Details</h4>

                                        <p>Session ID: #{session.session_id}</p>
                                        <p>Charger: #{session.charger_id}</p>
                                        <p>Connector: {session.connector_type}</p>
                                        <p>Power: {session.power_kw} kW</p>
                                        <p>Start: {formatDateTime(session.start_time)}</p>
                                        <p>End: {formatDateTime(session.end_time)}</p>
                                        <p>
                                            Energy Delivered:{" "}
                                            {session.energy_delivered_kwh ?? "Not available"} kWh
                                        </p>
                                        <p>
                                            Waiting Time:{" "}
                                            {session.wait_time_minutes ?? "Not available"} minutes
                                        </p>
                                        <p>
                                            Session Cost: {formatCurrency(session.cost)}
                                        </p>

                                        <span
                                            className={
                                                session.session_status === "COMPLETED"
                                                    ? "status"
                                                    : "unavailable"
                                            }
                                        >
                                            {session.session_status || "Unknown"}
                                        </span>

                                    </div>

                                    <div className="history-details">

                                        <h4>Payment Details</h4>

                                        <p>
                                            Payment ID:{" "}
                                            {session.payment_id
                                                ? `#${session.payment_id}`
                                                : "Not available"}
                                        </p>

                                        <p>Amount: {formatCurrency(session.amount)}</p>
                                        <p>
                                            Payment Method:{" "}
                                            {session.payment_method || "Not available"}
                                        </p>
                                        <p>
                                            Payment Time:{" "}
                                            {formatDateTime(session.transaction_time)}
                                        </p>
                                        <p>
                                            Payment Status:{" "}
                                            {session.payment_status || "Not available"}
                                        </p>

                                    </div>

                                </div>

                            ))}

                        </div>

                        <button
                            className="back-button"
                            onClick={handleStations}
                        >
                            ← Back to Stations
                        </button>

                    </section>

                ) : activeView === "bookings" ? (

                    /* My Bookings Page */

                    <section>

                        <h2>My Bookings</h2>

                        <p>View and manage your charging reservations.</p>

                        {bookingsLoading && (
                            <p>Loading your bookings...</p>
                        )}

                        {!bookingsLoading &&
                            bookings.length === 0 &&
                            !error && (
                                <p>You have not made any bookings yet.</p>
                            )}

                        <div className="station-grid">

                            {!bookingsLoading && bookings.map((booking) => {

                                const expired = isBookingExpired(booking);

                                return (
                                    <div
                                        className="station-card"
                                        key={booking.booking_id}
                                    >

                                        <h3>{booking.station_name}</h3>
                                        <p>{booking.address}</p>
                                        <p>Booking ID: #{booking.booking_id}</p>
                                        <p>Charger: #{booking.charger_id}</p>
                                        <p>Connector: {booking.connector_type}</p>
                                        <p>Power: {booking.power_kw} kW</p>
                                        <p>Start: {formatDateTime(booking.booking_start)}</p>
                                        <p>End: {formatDateTime(booking.booking_end)}</p>

                                        <span
                                            className={
                                                booking.status === "CONFIRMED" && !expired
                                                    ? "status"
                                                    : "unavailable"
                                            }
                                        >
                                            {expired ? "EXPIRED" : booking.status}
                                        </span>

                                        {/* Start Charging Controls */}
                                        {booking.status === "CONFIRMED" && !expired && (

                                            <div className="charging-controls">

                                                <h4>Start Charging</h4>

                                                {vehiclesLoading ? (
                                                    <p>Loading vehicles...</p>
                                                ) : vehicles.length === 0 ? (
                                                    <p>No vehicle registered to your account.</p>
                                                ) : (

                                                    <>
                                                        <label>Select Your Vehicle</label>

                                                        <select
                                                            value={selectedVehicleId}
                                                            onChange={(e) =>
                                                                setSelectedVehicleId(e.target.value)
                                                            }
                                                            disabled={
                                                                !!activeSession ||
                                                                chargingActionLoading
                                                            }
                                                        >

                                                            {vehicles.map((vehicle) => (

                                                                <option
                                                                    key={vehicle.vehicle_id}
                                                                    value={vehicle.vehicle_id}
                                                                >
                                                                    {vehicle.manufacturer}{" "}
                                                                    {vehicle.model_name}
                                                                    {" - "}
                                                                    {vehicle.registration_no}
                                                                </option>

                                                            ))}

                                                        </select>

                                                        <button
                                                            className="booking-button"
                                                            onClick={() =>
                                                                handleStartCharging(booking.booking_id)
                                                            }
                                                            disabled={
                                                                !!activeSession ||
                                                                chargingActionLoading ||
                                                                !selectedVehicleId
                                                            }
                                                        >
                                                            {chargingActionLoading
                                                                ? "Please wait..."
                                                                : activeSession
                                                                    ? "Another Session Is Active"
                                                                    : "⚡ Start Charging"}
                                                        </button>
                                                    </>

                                                )}

                                            </div>

                                        )}

                                        {/* Cancel Booking */}
                                        {(booking.status === "CONFIRMED" ||
                                            booking.status === "PENDING") &&
                                            !expired && (

                                                <button
                                                    className="cancel-button"
                                                    onClick={() =>
                                                        handleCancelBooking(booking.booking_id)
                                                    }
                                                    disabled={cancellingId === booking.booking_id}
                                                >
                                                    {cancellingId === booking.booking_id
                                                        ? "Cancelling..."
                                                        : "Cancel Booking"}
                                                </button>

                                            )}

                                    </div>
                                );
                            })}

                        </div>

                        <button
                            className="back-button"
                            onClick={handleStations}
                        >
                            ← Back to Stations
                        </button>

                    </section>

                ) : activeView === "favorites" ? (

                    /* My Favorites Page */

                    <section>

                        <h2>My Favorite Stations</h2>

                        <p>
                            Your saved charging stations are listed here.
                        </p>

                        {favoritesLoading && (
                            <p>Loading your favourite stations...</p>
                        )}

                        {!favoritesLoading &&
                            favoriteStations.length === 0 &&
                            !error && (
                                <div className="history-empty">
                                    <h3>No Favorite Stations Yet</h3>
                                    <p>
                                        Add stations to your favourites to
                                        access them quickly.
                                    </p>
                                </div>
                            )}

                        <div className="station-grid">

                            {!favoritesLoading &&
                                favoriteStations.map((station) =>
                                    renderStationCard(station)
                                )}

                        </div>

                        <button
                            className="back-button"
                            onClick={handleStations}
                        >
                            ← Back to Stations
                        </button>

                    </section>

                ) : selectedStation ? (

                    /* Station Details Page */

                    <>

                        <button
                            className="back-button"
                            onClick={() => {
                                setSelectedStation(null);
                                setChargers([]);
                                setSelectedCharger(null);
                                setError("");
                                setMessage("");
                            }}
                        >
                            ← Back to Stations
                        </button>

                        <div className="station-heading">

                            <div className="station-heading-top">

                                <div>
                                    <h2>{selectedStation.station_name}</h2>
                                    <p>{selectedStation.address}</p>
                                </div>

                                <button
                                    className={
                                        isFavorite(selectedStation.station_id)
                                            ? "favorite-button favorited"
                                            : "favorite-button"
                                    }
                                    onClick={() =>
                                        handleToggleFavorite(selectedStation.station_id)
                                    }
                                    disabled={
                                        favoriteActionId === selectedStation.station_id
                                    }
                                >
                                    {isFavorite(selectedStation.station_id)
                                        ? "♥ Remove Favorite"
                                        : "♡ Add Favorite"}
                                </button>

                            </div>

                            <p>Operator: {selectedStation.operator}</p>

                            <p>
                                Opening Hours:{" "}
                                {String(selectedStation.opening_time)}
                                {" - "}
                                {String(selectedStation.closing_time)}
                            </p>

                            <hr />

                            <h3>Station Status and Utilization</h3>

                            <p>
                                Available Chargers: {selectedStation.snapshot_available_count ?? "Not available"}
                            </p>

                            <p>
                                Utilization: {Number(selectedStation.utilization_rate ?? 0).toFixed(2)}%
                            </p>

                            <p>
                                Queue Length: {selectedStation.queue_length ?? 0}
                            </p>

                          

                            <h3>Demand Forecast</h3>

                            <p>
                                Predicted Demand: {selectedStation.predicted_demand ?? "Not available"}
                            </p>

                            <p>
                                Predicted Queue: {selectedStation.predicted_queue ?? "Not available"}
                            </p>

                            

                            <h3>Pricing</h3>

                            <p>
                                Price per kWh: {formatCurrency(selectedStation.price_per_kwh)}
                            </p>

                        </div>

                        <h2>Available Chargers</h2>

                        {chargerLoading && (
                            <p>Loading chargers...</p>
                        )}

                        {!chargerLoading &&
                            !error &&
                            chargers.length === 0 && (
                                <p>No chargers found at this station.</p>
                            )}

                        <div className="station-grid">

                            {chargers.map((charger) => (

                                <div
                                    className="station-card"
                                    key={charger.charger_id}
                                >

                                    <h3>Charger #{charger.charger_id}</h3>

                                    <p>Connector: {charger.connector_type}</p>
                                    <p>Power: {charger.power_kw} kW</p>
                                    <p>Status: {charger.status}</p>

                                    <p>
                                        Station Utilization:{" "}
                                        {Number(charger.utilization_rate ?? 0).toFixed(2)}%
                                    </p>

                                    <p>
                                        Predicted Demand: {charger.predicted_demand ?? "Not available"}
                                    </p>

                                    <p>
                                        Predicted Queue: {charger.predicted_queue ?? "Not available"}
                                    </p>

                                

                                    <p>
                                        Price per kWh: {formatCurrency(charger.price_per_kwh)}
                                    </p>

                                    <span
                                        className={
                                            charger.status === "AVAILABLE"
                                                ? "status"
                                                : "unavailable"
                                        }
                                    >
                                        {charger.status}
                                    </span>

                                    {charger.status === "AVAILABLE" && (

                                        <button
                                            className="booking-button"
                                            onClick={() => handleOpenBooking(charger)}
                                        >
                                            Book Charger
                                        </button>

                                    )}

                                    {selectedCharger?.charger_id === charger.charger_id && (

                                        <form
                                            className="booking-form"
                                            onSubmit={handleBookingSubmit}
                                        >

                                            <h3>Book This Charger</h3>

                                            <label>Booking Date</label>

                                            <input
                                                type="date"
                                                min={getToday()}
                                                value={bookingDate}
                                                onChange={(e) =>
                                                    setBookingDate(e.target.value)
                                                }
                                                required
                                            />

                                            <label>Start Time</label>

                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) =>
                                                    setStartTime(e.target.value)
                                                }
                                                required
                                            />

                                            <label>End Time</label>

                                            <input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) =>
                                                    setEndTime(e.target.value)
                                                }
                                                required
                                            />

                                            <div className="booking-actions">

                                                <button
                                                    type="submit"
                                                    disabled={bookingLoading}
                                                >
                                                    {bookingLoading
                                                        ? "Booking..."
                                                        : "Confirm Booking"}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="cancel-button"
                                                    onClick={() =>
                                                        setSelectedCharger(null)
                                                    }
                                                >
                                                    Close
                                                </button>

                                            </div>

                                        </form>

                                    )}

                                </div>

                            ))}

                        </div>

                        {/* Station Ratings Section */}

                        <section className="ratings-section">

                            <h2>Station Ratings & Reviews</h2>

                            <div className="rating-summary">

                                <div className="rating-score">

                                    <span className="rating-number">
                                        {averageRating === null
                                            ? "—"
                                            : Number(averageRating).toFixed(1)}
                                    </span>

                                    <span className="rating-stars">
                                        {"★".repeat(
                                            Math.round(Number(averageRating || 0))
                                        )}
                                        {"☆".repeat(
                                            5 - Math.round(Number(averageRating || 0))
                                        )}
                                    </span>

                                    <span>
                                        {totalRatings}{" "}
                                        {totalRatings === 1 ? "rating" : "ratings"}
                                    </span>

                                </div>

                            </div>

                            <div className="rating-form-container">

                                <h3>
                                    {ratings.some(
                                        (item) =>
                                            Number(item.user_id) ===
                                            Number(user.user_id)
                                    )
                                        ? "Update Your Rating"
                                        : "Rate This Station"}
                                </h3>

                                <form
                                    className="rating-form"
                                    onSubmit={handleRatingSubmit}
                                >

                                    <label htmlFor="ratingValue">
                                        Your Rating
                                    </label>

                                    <select
                                        id="ratingValue"
                                        value={ratingValue}
                                        onChange={(e) =>
                                            setRatingValue(e.target.value)
                                        }
                                    >
                                        <option value="5">5 - Excellent</option>
                                        <option value="4">4 - Very Good</option>
                                        <option value="3">3 - Good</option>
                                        <option value="2">2 - Fair</option>
                                        <option value="1">1 - Poor</option>
                                    </select>

                                    <label htmlFor="reviewText">
                                        Your Review (Optional)
                                    </label>

                                    <textarea
                                        id="reviewText"
                                        rows="4"
                                        maxLength="1000"
                                        placeholder="Share your experience with this charging station..."
                                        value={reviewText}
                                        onChange={(e) =>
                                            setReviewText(e.target.value)
                                        }
                                    />

                                    <p className="character-count">
                                        {reviewText.length}/1000 characters
                                    </p>

                                    <button
                                        type="submit"
                                        className="booking-button"
                                        disabled={ratingSubmitting}
                                    >
                                        {ratingSubmitting
                                            ? "Submitting..."
                                            : ratings.some(
                                                (item) =>
                                                    Number(item.user_id) ===
                                                    Number(user.user_id)
                                            )
                                                ? "Update Rating"
                                                : "Submit Rating"}
                                    </button>

                                </form>

                            </div>

                            <div className="reviews-list">

                                <h3>Customer Reviews</h3>

                                {ratingsLoading && (
                                    <p>Loading ratings...</p>
                                )}

                                {!ratingsLoading &&
                                    ratings.length === 0 && (
                                        <div className="history-empty">
                                            <p>
                                                No ratings yet. Be the first
                                                to review this station!
                                            </p>
                                        </div>
                                    )}

                                {!ratingsLoading && ratings.map((rating) => (

                                    <div
                                        className="review-card"
                                        key={rating.rating_id}
                                    >

                                        <div className="review-header">

                                            <strong>
                                                {rating.customer_name || "Customer"}
                                            </strong>

                                            <span className="review-stars">
                                                {"★".repeat(Number(rating.rating))}
                                                {"☆".repeat(
                                                    5 - Number(rating.rating)
                                                )}
                                            </span>

                                        </div>

                                        {rating.review && (
                                            <p>{rating.review}</p>
                                        )}

                                        <span className="review-date">
                                            {formatDateTime(rating.created_at)}
                                        </span>

                                        {Number(rating.user_id) ===
                                            Number(user.user_id) && (
                                                <span className="your-review-label">
                                                    Your Review
                                                </span>
                                            )}

                                    </div>

                                ))}

                            </div>

                        </section>

                    </>

                ) : (

                    /* Stations Dashboard */

                    <>

                        <h2>Customer Dashboard</h2>

                        <p>
                            Find and explore EV charging stations.
                        </p>

                        <h2>Charging Stations</h2>

                        <div className="station-grid">

                            {stations.map((station) =>
                                renderStationCard(station)
                            )}

                        </div>

                        {stations.length === 0 && !error && (
                            <p>No charging stations found.</p>
                        )}

                    </>

                )}

            </main>

        </div>
    );
}

export default App;
