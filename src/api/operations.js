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


// Attendance (clock in / clock out), paged: ?page, limit, staffId, status, from, to, location_id
export function listStaffSessions(params = {}) {
  return apiGet(withQuery("/api/v1/staff-sessions", params), auth)
}

// Cash drawer batches (opened / closed on the POS, or from the dashboard)
export function listBatches(params = {}) {
  return apiGet(withQuery("/api/v1/batches", params), auth)
}

// { staffId, location_id?, opening_amount }
export function openBatch(body) {
  return apiPost("/api/v1/register-sessions/open", body, auth)
}

// { staffId, batch_id, total_cash }
export function closeBatch(body) {
  return apiPost("/api/v1/register-sessions/close", body, auth)
}

// Attendance from the dashboard: { staffId, location_id? }
export function clockIn(body) {
  return apiPost("/api/v1/staff-sessions/clock-in", body, auth)
}

export function clockOut(body) {
  return apiPost("/api/v1/staff-sessions/clock-out", body, auth)
}
