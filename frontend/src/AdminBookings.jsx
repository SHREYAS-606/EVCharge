
import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api";

function AdminBookings({ token }) {
    const [bookings, setBookings] = useState([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [selectedBooking, setSelectedBooking] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cancellingId, setCancellingId] = useState(null);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setLoading(true);
                setError("");

                const params = new URLSearchParams();

                if (search.trim()) {
                    params.append("search", search.trim());
                }

                if (status) {
                    params.append("status", status);
                }

                const response = await fetch(
                    `${API_URL}/admin/bookings?${params.toString()}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to fetch bookings.");
                }

                setBookings(data.bookings || []);

                // Keep the selected booking updated after a refresh.
                if (selectedBooking) {
                    const updatedBooking = (data.bookings || []).find(
                        booking =>
                            booking.booking_id === selectedBooking.booking_id
                    );

                    if (updatedBooking) {
                        setSelectedBooking(updatedBooking);
                    } else {
                        setSelectedBooking(null);
                    }
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchBookings, 300);

        return () => clearTimeout(timeout);
    }, [search, status, token]);

    const formatDate = (date) => {
        if (!date) return "N/A";

        return new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusStyle = (bookingStatus) => {
        switch (bookingStatus) {
            case "CONFIRMED":
                return {
                    background: "#dcfce7",
                    color: "#166534"
                };

            case "PENDING":
                return {
                    background: "#fef3c7",
                    color: "#92400e"
                };

            case "COMPLETED":
                return {
                    background: "#dbeafe",
                    color: "#1e40af"
                };

            case "CANCELLED":
                return {
                    background: "#fee2e2",
                    color: "#991b1b"
                };

            default:
                return {
                    background: "#e5e7eb",
                    color: "#374151"
                };
        }
    };

    const handleViewDetails = async (bookingId) => {
        try {
            setError("");

            const response = await fetch(
                `${API_URL}/admin/bookings/${bookingId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch booking details.");
            }

            setSelectedBooking(data.booking);

        } catch (err) {
            setError(err.message);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        const confirmed = window.confirm(
            `Are you sure you want to cancel booking #${bookingId}?`
        );

        if (!confirmed) return;

        try {
            setCancellingId(bookingId);
            setError("");
            setSuccess("");

            const response = await fetch(
                `${API_URL}/admin/bookings/${bookingId}/cancel`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to cancel booking.");
            }

            setSuccess(data.message || "Booking cancelled successfully.");

            // Update the booking list immediately.
            setBookings(previous =>
                previous.map(booking =>
                    booking.booking_id === bookingId
                        ? { ...booking, status: "CANCELLED" }
                        : booking
                )
            );

            if (selectedBooking?.booking_id === bookingId) {
                setSelectedBooking(previous => ({
                    ...previous,
                    status: "CANCELLED"
                }));
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setCancellingId(null);
        }
    };

    const canCancel = (booking) => {
        return (
            ["PENDING", "CONFIRMED"].includes(booking.status) &&
            new Date(booking.booking_start) > new Date()
        );
    };

    const cardStyle = {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "18px",
        marginBottom: "20px"
    };

    const buttonStyle = {
        border: "none",
        borderRadius: "6px",
        padding: "8px 12px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "13px"
    };

    return (
        <div style={{ color: "#111827" }}>
            <h2 style={{ marginBottom: "20px" }}>
                Booking Management
            </h2>

            {/* Summary */}
            <div style={{
                ...cardStyle,
                display: "flex",
                gap: "25px",
                flexWrap: "wrap"
            }}>
                <div>
                    <div style={{ color: "#6b7280", fontSize: "13px" }}>
                        Total Bookings
                    </div>
                    <h2 style={{ margin: "5px 0" }}>
                        {bookings.length}
                    </h2>
                </div>

                <div>
                    <div style={{ color: "#6b7280", fontSize: "13px" }}>
                        Confirmed
                    </div>
                    <h2 style={{ margin: "5px 0", color: "#16a34a" }}>
                        {bookings.filter(b => b.status === "CONFIRMED").length}
                    </h2>
                </div>

                <div>
                    <div style={{ color: "#6b7280", fontSize: "13px" }}>
                        Pending
                    </div>
                    <h2 style={{ margin: "5px 0", color: "#d97706" }}>
                        {bookings.filter(b => b.status === "PENDING").length}
                    </h2>
                </div>

                <div>
                    <div style={{ color: "#6b7280", fontSize: "13px" }}>
                        Cancelled
                    </div>
                    <h2 style={{ margin: "5px 0", color: "#dc2626" }}>
                        {bookings.filter(b => b.status === "CANCELLED").length}
                    </h2>
                </div>
            </div>

            {/* Search and Filter */}
            <div style={{
                ...cardStyle,
                display: "flex",
                gap: "12px",
                flexWrap: "wrap"
            }}>
                <input
                    type="text"
                    placeholder="Search booking ID, customer, email or station..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: "1",
                        minWidth: "220px",
                        padding: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px"
                    }}
                />

                <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    style={{
                        padding: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        minWidth: "160px"
                    }}
                >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            {error && (
                <div style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    padding: "12px",
                    borderRadius: "6px",
                    marginBottom: "15px"
                }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{
                    background: "#dcfce7",
                    color: "#166534",
                    padding: "12px",
                    borderRadius: "6px",
                    marginBottom: "15px"
                }}>
                    {success}
                </div>
            )}

            {/* Booking Details */}
            {selectedBooking && (
                <div style={cardStyle}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px"
                    }}>
                        <h3>Booking #{selectedBooking.booking_id}</h3>

                        <button
                            onClick={() => setSelectedBooking(null)}
                            style={{
                                ...buttonStyle,
                                background: "#e5e7eb",
                                color: "#111827"
                            }}
                        >
                            Close Details
                        </button>
                    </div>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "18px",
                        marginTop: "15px"
                    }}>
                        <div>
                            <strong>Customer</strong>
                            <p>{selectedBooking.customer_name}</p>
                            <p>{selectedBooking.customer_email}</p>
                        </div>

                        <div>
                            <strong>Station</strong>
                            <p>{selectedBooking.station_name}</p>
                            <p>{selectedBooking.station_address}</p>
                        </div>

                        <div>
                            <strong>Charger</strong>
                            <p>Charger ID: {selectedBooking.charger_id}</p>
                            <p>{selectedBooking.connector_type}</p>
                            <p>{selectedBooking.power_kw} kW</p>
                        </div>

                        <div>
                            <strong>Booking Schedule</strong>
                            <p>Start: {formatDate(selectedBooking.booking_start)}</p>
                            <p>End: {formatDate(selectedBooking.booking_end)}</p>
                        </div>

                        <div>
                            <strong>Status</strong>
                            <p>
                                <span style={{
                                    ...getStatusStyle(selectedBooking.status),
                                    padding: "5px 10px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: "700"
                                }}>
                                    {selectedBooking.status}
                                </span>
                            </p>
                        </div>

                        <div>
                            <strong>Created At</strong>
                            <p>{formatDate(selectedBooking.created_at)}</p>
                        </div>
                    </div>

                    {canCancel(selectedBooking) && (
                        <button
                            onClick={() => handleCancelBooking(selectedBooking.booking_id)}
                            disabled={cancellingId === selectedBooking.booking_id}
                            style={{
                                ...buttonStyle,
                                background: "#dc2626",
                                color: "#ffffff",
                                marginTop: "15px",
                                opacity: cancellingId === selectedBooking.booking_id ? 0.6 : 1
                            }}
                        >
                            {cancellingId === selectedBooking.booking_id
                                ? "Cancelling..."
                                : "Cancel Booking"}
                        </button>
                    )}
                </div>
            )}

            {/* Bookings Table */}
            <div style={{
                ...cardStyle,
                overflowX: "auto"
            }}>
                <h3 style={{ marginTop: 0 }}>
                    All Bookings
                </h3>

                {loading ? (
                    <p>Loading bookings...</p>
                ) : bookings.length === 0 ? (
                    <p style={{ color: "#6b7280" }}>
                        No bookings found.
                    </p>
                ) : (
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "850px"
                    }}>
                        <thead>
                            <tr style={{ background: "#f3f4f6" }}>
                                {[
                                    "Booking ID",
                                    "Customer",
                                    "Station",
                                    "Charger",
                                    "Start Time",
                                    "End Time",
                                    "Status",
                                    "Actions"
                                ].map(heading => (
                                    <th
                                        key={heading}
                                        style={{
                                            padding: "12px",
                                            textAlign: "left",
                                            fontSize: "13px",
                                            borderBottom: "1px solid #e5e7eb"
                                        }}
                                    >
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {bookings.map(booking => (
                                <tr key={booking.booking_id}>
                                    <td style={cellStyle}>
                                        #{booking.booking_id}
                                    </td>

                                    <td style={cellStyle}>
                                        <strong>{booking.customer_name}</strong>
                                        <div style={{ color: "#6b7280", fontSize: "12px" }}>
                                            {booking.customer_email}
                                        </div>
                                    </td>

                                    <td style={cellStyle}>
                                        {booking.station_name}
                                    </td>

                                    <td style={cellStyle}>
                                        {booking.connector_type}
                                        <div style={{ color: "#6b7280", fontSize: "12px" }}>
                                            {booking.power_kw} kW
                                        </div>
                                    </td>

                                    <td style={cellStyle}>
                                        {formatDate(booking.booking_start)}
                                    </td>

                                    <td style={cellStyle}>
                                        {formatDate(booking.booking_end)}
                                    </td>

                                    <td style={cellStyle}>
                                        <span style={{
                                            ...getStatusStyle(booking.status),
                                            padding: "5px 9px",
                                            borderRadius: "20px",
                                            fontSize: "11px",
                                            fontWeight: "700"
                                        }}>
                                            {booking.status}
                                        </span>
                                    </td>

                                    <td style={cellStyle}>
                                        <div style={{
                                            display: "flex",
                                            gap: "6px"
                                        }}>
                                            <button
                                                onClick={() => handleViewDetails(booking.booking_id)}
                                                style={{
                                                    ...buttonStyle,
                                                    background: "#2563eb",
                                                    color: "#fff"
                                                }}
                                            >
                                                View
                                            </button>

                                            {canCancel(booking) && (
                                                <button
                                                    onClick={() => handleCancelBooking(booking.booking_id)}
                                                    disabled={cancellingId === booking.booking_id}
                                                    style={{
                                                        ...buttonStyle,
                                                        background: "#dc2626",
                                                        color: "#fff"
                                                    }}
                                                >
                                                    {cancellingId === booking.booking_id
                                                        ? "..."
                                                        : "Cancel"}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const cellStyle = {
    padding: "12px",
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "13px",
    verticalAlign: "middle"
};

export default AdminBookings;
