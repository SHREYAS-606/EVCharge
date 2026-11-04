
import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api";

function AdminUsers({ token }) {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const fetchUsers = async (searchValue = search) => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_URL}/admin/users?search=${encodeURIComponent(searchValue)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch users.");
            }

            setUsers(data.users || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers("");
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(search);
    };

    const updateStatus = async (userId, currentStatus) => {
        const newStatus =
            currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        const confirmed = window.confirm(
            `Are you sure you want to ${newStatus.toLowerCase()} this user?`
        );

        if (!confirmed) return;

        try {
            setError("");
            setMessage("");

            const response = await fetch(
                `${API_URL}/admin/users/${userId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update user.");
            }

            setMessage(data.message);
            fetchUsers(search);
        } catch (err) {
            setError(err.message);
        }
    };

    const styles = {
        container: {
            padding: "24px",
            background: "#f8fafc",
            borderRadius: "12px"
        },
        heading: {
            fontSize: "24px",
            marginBottom: "8px",
            color: "#1e293b"
        },
        description: {
            color: "#64748b",
            marginBottom: "22px"
        },
        searchForm: {
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            flexWrap: "wrap"
        },
        input: {
            padding: "11px 14px",
            border: "1px solid #cbd5e1",
            borderRadius: "7px",
            minWidth: "220px",
            flex: 1,
            fontSize: "14px"
        },
        button: {
            padding: "10px 18px",
            border: "none",
            borderRadius: "7px",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            fontWeight: "600"
        },
        tableWrapper: {
            overflowX: "auto",
            background: "white",
            borderRadius: "10px",
            border: "1px solid #e2e8f0"
        },
        table: {
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "750px"
        },
        th: {
            padding: "14px",
            textAlign: "left",
            background: "#f1f5f9",
            color: "#475569",
            fontSize: "13px",
            borderBottom: "1px solid #e2e8f0"
        },
        td: {
            padding: "14px",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "14px",
            color: "#334155"
        },
        badge: (status) => ({
            padding: "5px 10px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            background: status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
            color: status === "ACTIVE" ? "#166534" : "#991b1b"
        }),
        actionButton: (status) => ({
            padding: "7px 12px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            color: "white",
            background: status === "ACTIVE" ? "#dc2626" : "#16a34a"
        }),
        alert: {
            padding: "12px",
            borderRadius: "7px",
            marginBottom: "15px"
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>User Management</h2>

            <p style={styles.description}>
                View registered users and manage their account status.
            </p>

            <form onSubmit={handleSearch} style={styles.searchForm}>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={styles.input}
                />

                <button type="submit" style={styles.button}>
                    Search
                </button>

                <button
                    type="button"
                    style={{ ...styles.button, background: "#475569" }}
                    onClick={() => {
                        setSearch("");
                        fetchUsers("");
                    }}
                >
                    Reset
                </button>
            </form>

            {error && (
                <div style={{
                    ...styles.alert,
                    background: "#fee2e2",
                    color: "#991b1b"
                }}>
                    {error}
                </div>
            )}

            {message && (
                <div style={{
                    ...styles.alert,
                    background: "#dcfce7",
                    color: "#166534"
                }}>
                    {message}
                </div>
            )}

            <p style={{ marginBottom: "14px", color: "#475569" }}>
                Total users: <strong>{users.length}</strong>
            </p>

            {loading ? (
                <p>Loading users...</p>
            ) : users.length === 0 ? (
                <p>No users found.</p>
            ) : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Name</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Role</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Registered</th>
                                <th style={styles.th}>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.map((user) => (
                                <tr key={user.user_id}>
                                    <td style={styles.td}>
                                        {user.user_id}
                                    </td>

                                    <td style={styles.td}>
                                        {user.name}
                                    </td>

                                    <td style={styles.td}>
                                        {user.email}
                                    </td>

                                    <td style={styles.td}>
                                        {user.role}
                                    </td>

                                    <td style={styles.td}>
                                        <span style={styles.badge(user.status)}>
                                            {user.status}
                                        </span>
                                    </td>

                                    <td style={styles.td}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>

                                    <td style={styles.td}>
                                        {user.role === "ADMIN" ? (
                                            <span style={{ color: "#64748b" }}>
                                                Protected
                                            </span>
                                        ) : (
                                            <button
                                                style={styles.actionButton(user.status)}
                                                onClick={() =>
                                                    updateStatus(
                                                        user.user_id,
                                                        user.status
                                                    )
                                                }
                                            >
                                                {user.status === "ACTIVE"
                                                    ? "Deactivate"
                                                    : "Activate"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminUsers;
