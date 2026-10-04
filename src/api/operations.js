import { apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

// Shift history (register sessions are opened / closed on the desktop POS)
export function listRegisterSessions(params = {}) {
  return apiGet(withQuery("/api/v1/register-sessions", params), auth)
}

// Staff (cashiers / extra managers are users rows)
export function listStaff(params = {}) {
  return apiGet(withQuery("/api/v1/staff", params), auth)
}

export function createStaff(body) {
  return apiPost("/api/v1/staff", body, auth)
}

export function updateStaff(id, body) {
  return apiPatch(`/api/v1/staff/${id}`, body, auth)
}

export function getStaffSales(id, params = {}) {
  return apiGet(withQuery(`/api/v1/staff/${id}/sales`, params), auth)
}

