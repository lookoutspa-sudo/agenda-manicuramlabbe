const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("admin_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "REQUEST_ERROR");
    error.details = data.details;
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  health: () => request("/health"),
  getBrand: () => request("/brand"),
  getServices: (includeInactive = false) => request(`/services${includeInactive ? "?includeInactive=true" : ""}`),
  getAvailability: (date, serviceId) => request(`/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}`),
  createBooking: (payload) => request("/bookings", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getAdminBookings: () => request("/admin/bookings"),
  updateBookingStatus: (id, status) => request(`/admin/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteBooking: (id) => request(`/admin/bookings/${id}`, { method: "DELETE" }),
  createService: (payload) => request("/admin/services", { method: "POST", body: JSON.stringify(payload) }),
  updateService: (id, payload) => request(`/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
};
