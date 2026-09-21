const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://smart-efining-system-1.onrender.com"
    : "http://localhost:5000");

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error("Unable to connect to the fine management server.");
  }
  if (!res.ok || body.success === false) {
    throw new Error(body.message || "Something went wrong.");
  }
  return body;
}

// Public
export const getRecentFines = (limit = 6) => request(`/api/fines/recent?limit=${limit}`);
export const getFines = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/fines?${qs}`);
};
export const getFineById = (fineId) => request(`/api/fines/${encodeURIComponent(fineId)}`);
export const getStats = () => request(`/api/stats`);
export const getHealthStatus = () => request(`/api/health`);
export const createCheckoutSession = (fineId) =>
  request(`/api/payments/create-checkout-session`, { method: "POST", body: JSON.stringify({ fineId }) });
export const getSessionStatus = (sessionId) => request(`/api/payments/session-status/${sessionId}`);

// Telemetry & Vehicle monitoring
export const getVehicleStatus = (vehicleId) => request(`/api/vehicles/${encodeURIComponent(vehicleId)}/status`);
export const getVehicleLocation = (vehicleId) => request(`/api/vehicles/${encodeURIComponent(vehicleId)}/location`);
export const getVehicleTrail = (vehicleId, limit = 50) =>
  request(`/api/vehicles/${encodeURIComponent(vehicleId)}/trail?limit=${limit}`);
export const getSpeedZones = () => request(`/api/speed-zones`);
export const sendSimulatedTelemetry = (data) =>
  request(`/api/telemetry/simulate`, { method: "POST", body: JSON.stringify(data) });

/**
 * Create an SSE (Server-Sent Events) connection for real-time updates.
 * Returns an EventSource instance — caller must close it when done.
 */
export function createSSEConnection() {
  return new EventSource(`${API_URL}/api/events`);
}

export const clearVehicleTrail = (vehicleId) =>
  request(`/api/vehicles/${vehicleId}/trail`, { method: "DELETE" });

// Admin
export const adminLogin = (username, password) =>
  request(`/admin/api/auth/login`, { method: "POST", body: JSON.stringify({ username, password }) });

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("efine_admin_token") || ""}` });

export const adminDashboard = () => request(`/admin/api/dashboard`, { headers: authHeaders() });
export const adminListFines = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/admin/api/fines?${qs}`, { headers: authHeaders() });
};
export const adminCreateFine = (data) =>
  request(`/admin/api/fines`, { method: "POST", body: JSON.stringify(data), headers: authHeaders() });
export const adminCancelFine = (fineId) =>
  request(`/admin/api/fines/${fineId}/cancel`, { method: "PATCH", headers: authHeaders() });
export const adminListVehicles = () => request(`/admin/api/vehicles`, { headers: authHeaders() });
export const adminListDevices = () => request(`/admin/api/devices`, { headers: authHeaders() });
export const adminListPayments = () => request(`/admin/api/payments`, { headers: authHeaders() });
export const adminListSpeedZones = () => request(`/admin/api/speed-zones`, { headers: authHeaders() });

