
import { useCallback, useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api";

const emptyAnalytics = {
    congestion: [],
    utilization: [],
    demand: [],
    forecasts: []
};

function AdminAnalytics({ token }) {
    const [analytics, setAnalytics] = useState(emptyAnalytics);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =====================================================
    // FETCH ANALYTICS
    // =====================================================

    const fetchAnalytics = useCallback(async () => {
        if (!token) {
            setError("Authentication token is missing. Please log in again.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_URL}/admin/analytics`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                }
            );

            // Handle invalid or non-JSON responses.
            const responseText = await response.text();

            let data;

            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(
                    `Server returned an invalid response (HTTP ${response.status}). Check the backend.`
                );
            }

            // Debugging information.
            console.log(
                "Admin Analytics API Status:",
                response.status
            );

            console.log(
                "Admin Analytics API Response:",
                data
            );

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    `Failed to fetch analytics. HTTP ${response.status}`
                );
            }

            if (!data.analytics) {
                throw new Error(
                    "Analytics data is missing from the server response."
                );
            }

            setAnalytics({
                congestion: Array.isArray(data.analytics.congestion)
                    ? data.analytics.congestion
                    : [],

                utilization: Array.isArray(data.analytics.utilization)
                    ? data.analytics.utilization
                    : [],

                demand: Array.isArray(data.analytics.demand)
                    ? data.analytics.demand
                    : [],

                forecasts: Array.isArray(data.analytics.forecasts)
                    ? data.analytics.forecasts
                    : []
            });

        } catch (err) {
            console.error("Admin Analytics Error:", err);

            setError(
                err.message || "Something went wrong while fetching analytics."
            );

        } finally {
            setLoading(false);
        }
    }, [token]);

    // =====================================================
    // LOAD ANALYTICS
    // =====================================================

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // =====================================================
    // STYLES
    // =====================================================

    const cardStyle = {
        background: "#fff",
        padding: "22px",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        marginBottom: "25px"
    };

    const tableStyle = {
        width: "100%",
        borderCollapse: "collapse",
        minWidth: "650px"
    };

    const cellStyle = {
        padding: "12px",
        textAlign: "left",
        borderBottom: "1px solid #e5e7eb"
    };

    const buttonStyle = {
        padding: "10px 16px",
        border: "none",
        borderRadius: "6px",
        background: "#2563eb",
        color: "#fff",
        cursor: loading ? "not-allowed" : "pointer",
        fontWeight: "600",
        opacity: loading ? 0.7 : 1
    };

    // =====================================================
    // DISPLAY HELPERS
    // =====================================================

    const congestionColor = (level) => {
        if (level === "HIGH") return "#dc2626";
        if (level === "MEDIUM") return "#d97706";
        return "#16a34a";
    };

    const formatNumber = (value, digits = 2) => {
        const number = Number(value);

        return Number.isFinite(number)
            ? number.toFixed(digits)
            : "0.00";
    };

    const formatSnapshotTime = (value) => {
        if (!value) return "N/A";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString();
    };

    const formatDemandDate = (value) => {
        if (!value) return "N/A";

        if (typeof value === "string") {
            return value.slice(0, 10);
        }

        return new Date(value).toLocaleDateString();
    };

    const formatHour = (value) => {
        const hour = Number(value);

        if (!Number.isFinite(hour)) return "N/A";

        return `${String(hour).padStart(2, "0")}:00`;
    };

    const renderTableMessage = (message) => (
        <p style={{ color: "#64748b" }}>
            {message}
        </p>
    );

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div style={cardStyle}>
                <p>Loading station analytics...</p>
            </div>
        );
    }

    // =====================================================
    // ERROR
    // =====================================================

    if (error) {
        return (
            <div style={{
                ...cardStyle,
                borderLeft: "4px solid #dc2626"
            }}>
                <h3 style={{ color: "#dc2626" }}>
                    Failed to Load Analytics
                </h3>

                <p>{error}</p>

                <button
                    onClick={fetchAnalytics}
                    style={buttonStyle}
                    disabled={loading}
                >
                    Retry
                </button>
            </div>
        );
    }

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div>

            {/* HEADER */}

            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "25px"
            }}>
                <div>
                    <h2>Station Analytics</h2>

                    <p style={{ color: "#64748b" }}>
                        Monitor station congestion, utilization,
                        historical demand and future forecasts.
                    </p>
                </div>

                <button
                    onClick={fetchAnalytics}
                    style={buttonStyle}
                    disabled={loading}
                >
                    Refresh Analytics
                </button>
            </div>

            {/* =================================================
                1. STATION CONGESTION
            ================================================= */}

            <section style={cardStyle}>
                <h3>Station Congestion</h3>

                <p style={{ color: "#64748b" }}>
                    Latest congestion status for each station.
                </p>

                {analytics.congestion.length === 0 ? (
                    renderTableMessage(
                        "No congestion snapshots available yet."
                    )
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                    {[
                                        "Station",
                                        "Available",
                                        "Occupied",
                                        "Queue",
                                        "Wait (min)",
                                        "Utilization",
                                        "Congestion",
                                        "Snapshot Time"
                                    ].map((heading) => (
                                        <th key={heading} style={cellStyle}>
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {analytics.congestion.map((item, index) => (
                                    <tr key={`${item.station_id}-${index}`}>
                                        <td style={cellStyle}>
                                            {item.station_name}
                                        </td>

                                        <td style={cellStyle}>
                                            {item.available_count}
                                        </td>

                                        <td style={cellStyle}>
                                            {item.occupied_count}
                                        </td>

                                        <td style={cellStyle}>
                                            {item.queue_length}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(item.avg_wait_time)}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(item.utilization_rate)}%
                                        </td>

                                        <td style={{
                                            ...cellStyle,
                                            color: congestionColor(
                                                item.congestion_level
                                            ),
                                            fontWeight: "700"
                                        }}>
                                            {item.congestion_level || "N/A"}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatSnapshotTime(
                                                item.snapshot_time
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* =================================================
                2. STATION UTILIZATION
            ================================================= */}

            <section style={cardStyle}>
                <h3>Station Utilization</h3>

                <p style={{ color: "#64748b" }}>
                    Average charger utilization and waiting statistics.
                </p>

                {analytics.utilization.length === 0 ? (
                    renderTableMessage(
                        "No utilization data available."
                    )
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                    {[
                                        "Station",
                                        "Total Chargers",
                                        "Average Utilization",
                                        "Average Wait",
                                        "Average Queue"
                                    ].map((heading) => (
                                        <th key={heading} style={cellStyle}>
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {analytics.utilization.map((item) => (
                                    <tr key={item.station_id}>
                                        <td style={cellStyle}>
                                            {item.station_name}
                                        </td>

                                        <td style={cellStyle}>
                                            {item.total_chargers}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(
                                                item.average_utilization
                                            )}%
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(
                                                item.average_wait_time
                                            )} min
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(
                                                item.average_queue_length
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* =================================================
                3. HISTORICAL HOURLY DEMAND
            ================================================= */}

            <section style={cardStyle}>
                <h3>Historical Hourly Demand</h3>

                <p style={{ color: "#64748b" }}>
                    Hourly averages calculated from station snapshots.
                    Showing the latest 48 records.
                </p>

                {analytics.demand.length === 0 ? (
                    renderTableMessage(
                        "No historical demand data available yet."
                    )
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                    {[
                                        "Station",
                                        "Date",
                                        "Hour",
                                        "Avg Occupied",
                                        "Avg Queue",
                                        "Avg Wait",
                                        "Avg Utilization"
                                    ].map((heading) => (
                                        <th key={heading} style={cellStyle}>
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {analytics.demand.map((item, index) => (
                                    <tr
                                        key={`${item.station_id}-${item.demand_date}-${item.demand_hour}-${index}`}
                                    >
                                        <td style={cellStyle}>
                                            {item.station_name}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatDemandDate(item.demand_date)}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatHour(item.demand_hour)}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(item.average_occupied)}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(item.average_queue)}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(item.average_wait)} min
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(
                                                item.average_utilization
                                            )}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* =================================================
                4. FUTURE DEMAND FORECAST
            ================================================= */}

            <section style={cardStyle}>
                <h3>Future Demand Forecast</h3>

                <p style={{ color: "#64748b" }}>
                    Predicted station demand, queue length and
                    waiting time for the next six hours.
                </p>

                {analytics.forecasts.length === 0 ? (
                    renderTableMessage(
                        "No future forecasts available. The automatic forecast scheduler will populate this section."
                    )
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                    {[
                                        "Station",
                                        "Forecast Time",
                                        "Predicted Demand",
                                        "Predicted Queue",
                                        "Predicted Wait",
                                        "Confidence"
                                    ].map((heading) => (
                                        <th key={heading} style={cellStyle}>
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {analytics.forecasts.map((item, index) => (
                                    <tr
                                        key={`${item.station_id}-${item.forecast_time}-${index}`}
                                    >
                                        <td style={cellStyle}>
                                            {item.station_name}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatSnapshotTime(
                                                item.forecast_time
                                            )}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(item.predicted_demand)}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(item.predicted_queue)}
                                        </td>

                                        <td style={cellStyle}>
                                            {formatNumber(item.predicted_wait)} min
                                        </td>

                                        <td style={{
                                            ...cellStyle,
                                            fontWeight: "600"
                                        }}>
                                            {formatNumber(
                                                Number(item.confidence_score) * 100,
                                                0
                                            )}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

        </div>
    );
}

export default AdminAnalytics;
