
import { useEffect, useState } from "react";
import AdminUsers from "./AdminUsers";
import AdminBookings from "./AdminBookings";

const API_URL = "http://localhost:5000/api";

const initialStationForm = {
    station_name: "",
    address: "",
    latitude: "",
    longitude: "",
    operator: "",
    opening_time: "06:00",
    closing_time: "22:00"
};

const initialChargerForm = {
    connector_type: "",
    power_kw: ""
};

function AdminDashboard({ user, onLogout, token }) {
    // Dashboard states
    const [summary, setSummary] = useState(null);
    const [chargerStatuses, setChargerStatuses] = useState([]);
    const [bookingStatuses, setBookingStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Navigation
    const [activeTab, setActiveTab] = useState("dashboard");

    // Station management
    const [stations, setStations] = useState([]);
    const [stationsLoading, setStationsLoading] = useState(false);
    const [stationError, setStationError] = useState("");
    const [stationMessage, setStationMessage] = useState("");
    const [stationForm, setStationForm] = useState(initialStationForm);
    const [editingStationId, setEditingStationId] = useState(null);
    const [showStationForm, setShowStationForm] = useState(false);

    // Charger management
    const [selectedStation, setSelectedStation] = useState(null);
    const [chargers, setChargers] = useState([]);
    const [chargersLoading, setChargersLoading] = useState(false);
    const [chargerMessage, setChargerMessage] = useState("");
    const [chargerError, setChargerError] = useState("");
    const [chargerForm, setChargerForm] = useState(initialChargerForm);
    const [editingChargerId, setEditingChargerId] = useState(null);
    const [showChargerForm, setShowChargerForm] = useState(false);

    // Common API request helper
    const apiRequest = async (endpoint, method = "GET", body = null) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    };

    // Fetch dashboard summary
    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await apiRequest("/admin/summary");

            setSummary(data.summary);
            setChargerStatuses(data.chargerStatuses || []);
            setBookingStatuses(data.bookingStatuses || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [token]);

    // Fetch all stations
    const fetchStations = async () => {
        try {
            setStationsLoading(true);
            setStationError("");

            const data = await apiRequest("/admin/stations");

            setStations(data.stations || []);

        } catch (err) {
            setStationError(err.message);
        } finally {
            setStationsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "stations") {
            fetchStations();
        }
    }, [activeTab, token]);

    // Fetch chargers for selected station
    const fetchChargers = async (station) => {
        try {
            setSelectedStation(station);
            setChargersLoading(true);
            setChargerError("");
            setChargerMessage("");
            setShowChargerForm(false);
            setEditingChargerId(null);

            const data = await apiRequest(
                `/admin/stations/${station.station_id}/chargers`
            );

            setChargers(data.chargers || []);

        } catch (err) {
            setChargerError(err.message);
            setChargers([]);
        } finally {
            setChargersLoading(false);
        }
    };

    // Dashboard calculations
    const totalChargers = Number(summary?.totalChargers || 0);

    const getPercentage = (count) => {
        if (!totalChargers) return 0;
        return (Number(count) / totalChargers) * 100;
    };

    const getStatusColor = (status) => {
        const colors = {
            AVAILABLE: "#16a34a",
            OCCUPIED: "#2563eb",
            OUT_OF_SERVICE: "#dc2626",
            MAINTENANCE: "#d97706",
            ACTIVE: "#16a34a",
            INACTIVE: "#dc2626",
            CONFIRMED: "#16a34a",
            PENDING: "#d97706",
            CANCELLED: "#dc2626",
            COMPLETED: "#2563eb"
        };

        return colors[status] || "#64748b";
    };

    // Common styles
    const cardStyle = {
        background: "#fff",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 10px rgba(0,0,0,0.07)"
    };

    const buttonStyle = {
        padding: "9px 15px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "600"
    };

    const inputStyle = {
        width: "100%",
        padding: "11px",
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        boxSizing: "border-box",
        fontSize: "14px"
    };

    const statusList = (items) => (
        <div style={{ display: "grid", gap: "14px" }}>
            {items.length === 0 ? (
                <p>No records available.</p>
            ) : (
                items.map((item) => (
                    <div
                        key={item.status}
                        style={{
                            display: "flex",
                            justifyContent: "space-between"
                        }}
                    >
                        <span style={{
                            color: getStatusColor(item.status),
                            fontWeight: "600"
                        }}>
                            {item.status.replaceAll("_", " ")}
                        </span>

                        <strong>{item.count}</strong>
                    </div>
                ))
            )}
        </div>
    );

    const statCards = [
        {
            title: "Total Users",
            value: summary?.totalUsers,
            icon: "👥"
        },
        {
            title: "Total Stations",
            value: summary?.totalStations,
            icon: "📍"
        },
        {
            title: "Total Chargers",
            value: summary?.totalChargers,
            icon: "⚡"
        },
        {
            title: "Total Bookings",
            value: summary?.totalBookings,
            icon: "📅"
        },
        {
            title: "Charging Sessions",
            value: summary?.totalSessions,
            icon: "🔋"
        }
    ];

    // Station form handlers
    const handleStationInput = (e) => {
        const { name, value } = e.target;

        setStationForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const openAddStationForm = () => {
        setEditingStationId(null);
        setStationForm(initialStationForm);
        setStationMessage("");
        setStationError("");
        setShowStationForm(true);
    };

    const openEditStationForm = (station) => {
        setEditingStationId(station.station_id);

        setStationForm({
            station_name: station.station_name,
            address: station.address,
            latitude: station.latitude,
            longitude: station.longitude,
            operator: station.operator || "",
            opening_time: station.opening_time?.slice(0, 5) || "06:00",
            closing_time: station.closing_time?.slice(0, 5) || "22:00"
        });

        setStationMessage("");
        setStationError("");
        setShowStationForm(true);
    };

    const handleStationSubmit = async (e) => {
        e.preventDefault();

        try {
            setStationError("");
            setStationMessage("");

            const endpoint = editingStationId
                ? `/admin/stations/${editingStationId}`
                : "/admin/stations";

            const method = editingStationId ? "PUT" : "POST";

            const data = await apiRequest(
                endpoint,
                method,
                stationForm
            );

            setStationMessage(data.message);
            setShowStationForm(false);
            setEditingStationId(null);
            setStationForm(initialStationForm);

            await fetchStations();
            await fetchDashboard();

        } catch (err) {
            setStationError(err.message);
        }
    };

    // Change station status
    const handleStationStatus = async (stationId, status) => {
        const confirmed = window.confirm(
            `Are you sure you want to change this station status to ${status}?`
        );

        if (!confirmed) return;

        try {
            setStationError("");
            setStationMessage("");

            const data = await apiRequest(
                `/admin/stations/${stationId}/status`,
                "PATCH",
                { status }
            );

            setStationMessage(data.message);

            await fetchStations();
            await fetchDashboard();

        } catch (err) {
            setStationError(err.message);
        }
    };

    // Charger form handlers
    const handleChargerInput = (e) => {
        const { name, value } = e.target;

        setChargerForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const openAddChargerForm = () => {
        setEditingChargerId(null);
        setChargerForm(initialChargerForm);
        setChargerError("");
        setChargerMessage("");
        setShowChargerForm(true);
    };

    const openEditChargerForm = (charger) => {
        setEditingChargerId(charger.charger_id);

        setChargerForm({
            connector_type: charger.connector_type,
            power_kw: charger.power_kw
        });

        setChargerError("");
        setChargerMessage("");
        setShowChargerForm(true);
    };

    const handleChargerSubmit = async (e) => {
        e.preventDefault();

        try {
            setChargerError("");
            setChargerMessage("");

            const endpoint = editingChargerId
                ? `/admin/chargers/${editingChargerId}`
                : `/admin/stations/${selectedStation.station_id}/chargers`;

            const method = editingChargerId ? "PUT" : "POST";

            const data = await apiRequest(
                endpoint,
                method,
                chargerForm
            );

            setChargerMessage(data.message);
            setShowChargerForm(false);
            setEditingChargerId(null);
            setChargerForm(initialChargerForm);

            await fetchChargers(selectedStation);
            await fetchStations();
            await fetchDashboard();

        } catch (err) {
            setChargerError(err.message);
        }
    };

    // Change charger status
    const handleChargerStatus = async (chargerId, status) => {
        const confirmed = window.confirm(
            `Change charger status to ${status}?`
        );

        if (!confirmed) return;

        try {
            setChargerError("");
            setChargerMessage("");

            const data = await apiRequest(
                `/admin/chargers/${chargerId}/status`,
                "PATCH",
                { status }
            );

            setChargerMessage(data.message);

            await fetchChargers(selectedStation);
            await fetchStations();
            await fetchDashboard();

        } catch (err) {
            setChargerError(err.message);
        }
    };

    return (
        <div className="dashboard">

            {/* Navbar */}

            <header className="navbar">
                <h1>⚡ EVCharge Admin</h1>

                <div className="navbar-right">
                    <span>Welcome, {user.name}</span>

                    <button
                        className="logout-button"
                        onClick={onLogout}
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Navigation */}

            <div style={{
                display: "flex",
                gap: "12px",
                padding: "15px 30px",
                background: "#fff",
                borderBottom: "1px solid #e5e7eb",
                flexWrap: "wrap"
            }}>
                <button
                    onClick={() => {
                        setActiveTab("dashboard");
                        setSelectedStation(null);
                    }}
                    style={{
                        ...buttonStyle,
                        background: activeTab === "dashboard"
                            ? "#2563eb" : "#e5e7eb",
                        color: activeTab === "dashboard"
                            ? "#fff" : "#111827"
                    }}
                >
                    Dashboard
                </button>

                <button
                    onClick={() => {
                        setActiveTab("stations");
                        setSelectedStation(null);
                    }}
                    style={{
                        ...buttonStyle,
                        background: activeTab === "stations"
                            ? "#2563eb" : "#e5e7eb",
                        color: activeTab === "stations"
                            ? "#fff" : "#111827"
                    }}
                >
                    Manage Stations
                </button>

                <button
                    onClick={() => {
                        setActiveTab("users");
                        setSelectedStation(null);
                    }}
                    style={{
                        ...buttonStyle,
                        background: activeTab === "users"
                            ? "#2563eb" : "#e5e7eb",
                        color: activeTab === "users"
                            ? "#fff" : "#111827"
                    }}
                >
                    Manage Users
                </button>
                <button
                    onClick={() => {
                        setActiveTab("bookings");
                        setSelectedStation(null);
                    }}
                    style={{
                        ...buttonStyle,
                        background: activeTab === "bookings" ? "#2563eb" : "#e5e7eb",
                        color: activeTab === "bookings" ? "#fff" : "#111827"
                    }}
                >
                    Manage Bookings
                </button>
            </div>

            <main style={{ padding: "30px" }}>

                {/* DASHBOARD TAB */}

                {activeTab === "dashboard" && (
                    <>
                        <h2>Admin Dashboard</h2>

                        <p>
                            Manage and monitor the EVCharge platform.
                        </p>

                        {loading && <p>Loading dashboard data...</p>}

                        {error && (
                            <div className="error-message">
                                {error}
                                <button onClick={fetchDashboard}>
                                    Retry
                                </button>
                            </div>
                        )}

                        {!loading && summary && (
                            <>
                                {/* Statistics */}

                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fit, minmax(190px, 1fr))",
                                    gap: "20px",
                                    marginTop: "25px"
                                }}>
                                    {statCards.map((item) => (
                                        <div
                                            key={item.title}
                                            style={cardStyle}
                                        >
                                            <div style={{ fontSize: "28px" }}>
                                                {item.icon}
                                            </div>

                                            <p style={{ color: "#64748b" }}>
                                                {item.title}
                                            </p>

                                            <h2 style={{
                                                fontSize: "30px",
                                                margin: "5px 0"
                                            }}>
                                                {item.value ?? 0}
                                            </h2>
                                        </div>
                                    ))}
                                </div>

                                {/* Status Information */}

                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fit, minmax(280px, 1fr))",
                                    gap: "20px",
                                    marginTop: "30px"
                                }}>

                                    {/* Charger Availability */}

                                    <div style={cardStyle}>
                                        <h3>Charger Availability</h3>

                                        <p style={{ color: "#64748b" }}>
                                            Current status of all chargers
                                        </p>

                                        {statusList(chargerStatuses)}

                                        <h4 style={{ marginTop: "25px" }}>
                                            Availability Overview
                                        </h4>

                                        <div style={{
                                            display: "flex",
                                            height: "16px",
                                            overflow: "hidden",
                                            borderRadius: "10px",
                                            background: "#e5e7eb",
                                            marginTop: "12px"
                                        }}>
                                            {chargerStatuses.map((item) => (
                                                <div
                                                    key={item.status}
                                                    title={`${item.status}: ${item.count}`}
                                                    style={{
                                                        width: `${getPercentage(item.count)}%`,
                                                        background: getStatusColor(item.status)
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Booking Status */}

                                    <div style={cardStyle}>
                                        <h3>Booking Status</h3>

                                        <p style={{ color: "#64748b" }}>
                                            Overview of customer bookings
                                        </p>

                                        {statusList(bookingStatuses)}
                                    </div>

                                </div>
                            </>
                        )}
                    </>
                )}

                {/* MANAGE STATIONS TAB */}

                {activeTab === "stations" && (
                    <>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "15px"
                        }}>
                            <div>
                                <h2>Manage Charging Stations</h2>
                                <p>
                                    Add, edit and manage charging stations.
                                </p>
                            </div>

                            <button
                                onClick={openAddStationForm}
                                style={{
                                    ...buttonStyle,
                                    background: "#2563eb",
                                    color: "#fff"
                                }}
                            >
                                + Add Station
                            </button>
                        </div>

                        {stationMessage && (
                            <p style={{ color: "#16a34a", fontWeight: "600" }}>
                                {stationMessage}
                            </p>
                        )}

                        {stationError && (
                            <p style={{ color: "#dc2626" }}>
                                {stationError}
                            </p>
                        )}

                        {/* Add / Edit Station Form */}

                        {showStationForm && (
                            <div style={{
                                ...cardStyle,
                                marginTop: "25px"
                            }}>
                                <h3>
                                    {editingStationId
                                        ? "Edit Station"
                                        : "Add New Station"}
                                </h3>

                                <form onSubmit={handleStationSubmit}>
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fit, minmax(220px, 1fr))",
                                        gap: "15px"
                                    }}>
                                        <div>
                                            <label>Station Name</label>
                                            <input
                                                style={inputStyle}
                                                name="station_name"
                                                value={stationForm.station_name}
                                                onChange={handleStationInput}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label>Operator</label>
                                            <input
                                                style={inputStyle}
                                                name="operator"
                                                value={stationForm.operator}
                                                onChange={handleStationInput}
                                            />
                                        </div>

                                        <div>
                                            <label>Address</label>
                                            <input
                                                style={inputStyle}
                                                name="address"
                                                value={stationForm.address}
                                                onChange={handleStationInput}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label>Latitude</label>
                                            <input
                                                style={inputStyle}
                                                type="number"
                                                step="any"
                                                name="latitude"
                                                value={stationForm.latitude}
                                                onChange={handleStationInput}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label>Longitude</label>
                                            <input
                                                style={inputStyle}
                                                type="number"
                                                step="any"
                                                name="longitude"
                                                value={stationForm.longitude}
                                                onChange={handleStationInput}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label>Opening Time</label>
                                            <input
                                                style={inputStyle}
                                                type="time"
                                                name="opening_time"
                                                value={stationForm.opening_time}
                                                onChange={handleStationInput}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label>Closing Time</label>
                                            <input
                                                style={inputStyle}
                                                type="time"
                                                name="closing_time"
                                                value={stationForm.closing_time}
                                                onChange={handleStationInput}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div style={{
                                        display: "flex",
                                        gap: "10px",
                                        marginTop: "20px"
                                    }}>
                                        <button
                                            type="submit"
                                            style={{
                                                ...buttonStyle,
                                                background: "#16a34a",
                                                color: "#fff"
                                            }}
                                        >
                                            {editingStationId
                                                ? "Save Changes"
                                                : "Add Station"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowStationForm(false);
                                                setEditingStationId(null);
                                                setStationError("");
                                            }}
                                            style={{
                                                ...buttonStyle,
                                                background: "#e5e7eb"
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Station List */}

                        <div style={{
                            ...cardStyle,
                            marginTop: "25px",
                            overflowX: "auto"
                        }}>
                            <h3>All Charging Stations</h3>

                            {stationsLoading && (
                                <p>Loading stations...</p>
                            )}

                            {!stationsLoading && stations.length === 0 && (
                                <p>No charging stations found.</p>
                            )}

                            {!stationsLoading && stations.length > 0 && (
                                <table style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    minWidth: "850px"
                                }}>
                                    <thead>
                                        <tr style={{
                                            background: "#f3f4f6",
                                            textAlign: "left"
                                        }}>
                                            {[
                                                "ID",
                                                "Station",
                                                "Address",
                                                "Chargers",
                                                "Available",
                                                "Status",
                                                "Actions"
                                            ].map((heading) => (
                                                <th
                                                    key={heading}
                                                    style={{
                                                        padding: "13px",
                                                        borderBottom: "1px solid #ddd"
                                                    }}
                                                >
                                                    {heading}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {stations.map((station) => (
                                            <tr key={station.station_id}>
                                                <td style={{ padding: "13px" }}>
                                                    {station.station_id}
                                                </td>

                                                <td style={{ padding: "13px" }}>
                                                    <strong>
                                                        {station.station_name}
                                                    </strong>
                                                </td>

                                                <td style={{
                                                    padding: "13px",
                                                    maxWidth: "220px"
                                                }}>
                                                    {station.address}
                                                </td>

                                                <td style={{ padding: "13px" }}>
                                                    {station.total_chargers}
                                                </td>

                                                <td style={{ padding: "13px" }}>
                                                    {station.available_chargers || 0}
                                                </td>

                                                <td style={{
                                                    padding: "13px",
                                                    color: getStatusColor(station.status),
                                                    fontWeight: "600"
                                                }}>
                                                    {station.status}
                                                </td>

                                                <td style={{
                                                    padding: "13px",
                                                    display: "flex",
                                                    gap: "7px",
                                                    flexWrap: "wrap"
                                                }}>
                                                    <button
                                                        onClick={() =>
                                                            openEditStationForm(station)
                                                        }
                                                        style={{
                                                            ...buttonStyle,
                                                            background: "#dbeafe",
                                                            color: "#1d4ed8"
                                                        }}
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            fetchChargers(station)
                                                        }
                                                        style={{
                                                            ...buttonStyle,
                                                            background: "#e0e7ff",
                                                            color: "#4338ca"
                                                        }}
                                                    >
                                                        Chargers
                                                    </button>

                                                    <select
                                                        value={station.status}
                                                        onChange={(e) =>
                                                            handleStationStatus(
                                                                station.station_id,
                                                                e.target.value
                                                            )
                                                        }
                                                        style={{
                                                            padding: "8px",
                                                            borderRadius: "6px",
                                                            border: "1px solid #ddd"
                                                        }}
                                                    >
                                                        <option value="ACTIVE">
                                                            Active
                                                        </option>
                                                        <option value="INACTIVE">
                                                            Inactive
                                                        </option>
                                                        <option value="MAINTENANCE">
                                                            Maintenance
                                                        </option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Charger Management */}

                        {selectedStation && (
                            <div style={{
                                ...cardStyle,
                                marginTop: "30px"
                            }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: "12px"
                                }}>
                                    <div>
                                        <h3>
                                            Chargers - {selectedStation.station_name}
                                        </h3>
                                        <p style={{ color: "#64748b" }}>
                                            Manage chargers belonging to this station.
                                        </p>
                                    </div>

                                    <div style={{
                                        display: "flex",
                                        gap: "10px"
                                    }}>
                                        <button
                                            onClick={openAddChargerForm}
                                            style={{
                                                ...buttonStyle,
                                                background: "#2563eb",
                                                color: "#fff"
                                            }}
                                        >
                                            + Add Charger
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSelectedStation(null);
                                                setChargers([]);
                                                setShowChargerForm(false);
                                            }}
                                            style={{
                                                ...buttonStyle,
                                                background: "#e5e7eb"
                                            }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>

                                {chargerMessage && (
                                    <p style={{
                                        color: "#16a34a",
                                        fontWeight: "600"
                                    }}>
                                        {chargerMessage}
                                    </p>
                                )}

                                {chargerError && (
                                    <p style={{ color: "#dc2626" }}>
                                        {chargerError}
                                    </p>
                                )}

                                {/* Add / Edit Charger Form */}

                                {showChargerForm && (
                                    <form
                                        onSubmit={handleChargerSubmit}
                                        style={{
                                            background: "#f9fafb",
                                            padding: "18px",
                                            borderRadius: "8px",
                                            marginTop: "20px"
                                        }}
                                    >
                                        <h4>
                                            {editingChargerId
                                                ? "Edit Charger"
                                                : "Add New Charger"}
                                        </h4>

                                        <div style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(auto-fit, minmax(200px, 1fr))",
                                            gap: "15px"
                                        }}>
                                            <div>
                                                <label>Connector Type</label>
                                                <input
                                                    style={inputStyle}
                                                    name="connector_type"
                                                    placeholder="Example: CCS2"
                                                    value={chargerForm.connector_type}
                                                    onChange={handleChargerInput}
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label>Power (kW)</label>
                                                <input
                                                    style={inputStyle}
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    name="power_kw"
                                                    placeholder="Example: 60"
                                                    value={chargerForm.power_kw}
                                                    onChange={handleChargerInput}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            gap: "10px",
                                            marginTop: "15px"
                                        }}>
                                            <button
                                                type="submit"
                                                style={{
                                                    ...buttonStyle,
                                                    background: "#16a34a",
                                                    color: "#fff"
                                                }}
                                            >
                                                {editingChargerId
                                                    ? "Save Changes"
                                                    : "Add Charger"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowChargerForm(false);
                                                    setEditingChargerId(null);
                                                    setChargerError("");
                                                }}
                                                style={{
                                                    ...buttonStyle,
                                                    background: "#e5e7eb"
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Charger List */}

                                {chargersLoading && (
                                    <p>Loading chargers...</p>
                                )}

                                {!chargersLoading && chargers.length === 0 && (
                                    <p>No chargers found at this station.</p>
                                )}

                                {!chargersLoading && chargers.length > 0 && (
                                    <div style={{
                                        overflowX: "auto",
                                        marginTop: "20px"
                                    }}>
                                        <table style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            minWidth: "650px"
                                        }}>
                                            <thead>
                                                <tr style={{
                                                    background: "#f3f4f6",
                                                    textAlign: "left"
                                                }}>
                                                    {[
                                                        "Charger ID",
                                                        "Connector",
                                                        "Power",
                                                        "Status",
                                                        "Actions"
                                                    ].map((heading) => (
                                                        <th
                                                            key={heading}
                                                            style={{
                                                                padding: "13px",
                                                                borderBottom: "1px solid #ddd"
                                                            }}
                                                        >
                                                            {heading}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {chargers.map((charger) => (
                                                    <tr key={charger.charger_id}>
                                                        <td style={{ padding: "13px" }}>
                                                            {charger.charger_id}
                                                        </td>

                                                        <td style={{ padding: "13px" }}>
                                                            {charger.connector_type}
                                                        </td>

                                                        <td style={{ padding: "13px" }}>
                                                            {charger.power_kw} kW
                                                        </td>

                                                        <td style={{
                                                            padding: "13px",
                                                            color: getStatusColor(charger.status),
                                                            fontWeight: "600"
                                                        }}>
                                                            {charger.status.replaceAll("_", " ")}
                                                        </td>

                                                        <td style={{
                                                            padding: "13px",
                                                            display: "flex",
                                                            gap: "7px",
                                                            flexWrap: "wrap"
                                                        }}>
                                                            <button
                                                                onClick={() =>
                                                                    openEditChargerForm(charger)
                                                                }
                                                                style={{
                                                                    ...buttonStyle,
                                                                    background: "#dbeafe",
                                                                    color: "#1d4ed8"
                                                                }}
                                                            >
                                                                Edit
                                                            </button>

                                                            <select
                                                                value={charger.status}
                                                                onChange={(e) =>
                                                                    handleChargerStatus(
                                                                        charger.charger_id,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={{
                                                                    padding: "8px",
                                                                    borderRadius: "6px",
                                                                    border: "1px solid #ddd"
                                                                }}
                                                            >
                                                                <option value="AVAILABLE">
                                                                    Available
                                                                </option>
                                                                <option value="OCCUPIED">
                                                                    Occupied
                                                                </option>
                                                                <option value="OUT_OF_SERVICE">
                                                                    Out of Service
                                                                </option>
                                                                <option value="MAINTENANCE">
                                                                    Maintenance
                                                                </option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* MANAGE USERS TAB */}

                {activeTab === "users" && (
                    <AdminUsers token={token} />
                )}
                {activeTab === "bookings" && (
                    <AdminBookings token={token} />
                )}

            </main>
        </div>
    );
}

export default AdminDashboard;
