import { apiDelete, apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

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

// Soft delete: the staff member leaves the list; the row and history stay.
export function deleteStaff(id) {
  return apiDelete(`/api/v1/staff/${id}`, auth)
}

export function getStaffSales(id, params = {}) {
  return apiGet(withQuery(`/api/v1/staff/${id}/sales`, params), auth)
}


// Attendance (clock in / clock out), paged: ?page, limit, staffId, status, from, to, location_id
export function listStaffSessions(params = {}) {
  return apiGet(withQuery("/api/v1/staff-sessions", params), auth)
}

// One session (number or UUID): { clock_in_at?, clock_out_at? }; delete = soft delete.
export function updateStaffSession(id, body) {
  return apiPatch(`/api/v1/staff-sessions/${id}`, body, auth)
}

export function deleteStaffSession(id) {
  return apiDelete(`/api/v1/staff-sessions/${id}`, auth)
}

// One batch (number or UUID): { opening_cash?, cash_in?, cash_out?, counted_cash?, opened_at?, closed_at?, note? }.
export function updateBatch(id, body) {
  return apiPatch(`/api/v1/batches/${id}`, body, auth)
}

export function deleteBatch(id) {
  return apiDelete(`/api/v1/batches/${id}`, auth)
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
