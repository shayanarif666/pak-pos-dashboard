import { apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listLocations() {
  return apiGet("/api/v1/locations", auth)
}

export function getLocation(id) {
  return apiGet(`/api/v1/locations/${id}`, auth)
}

export function createLocation(body) {
  return apiPost("/api/v1/locations", body, auth)
}

export function updateLocation(id, body) {
  return apiPatch(`/api/v1/locations/${id}`, body, auth)
}

export function listPosDevices(params = {}) {
  return apiGet(withQuery("/api/v1/pos-devices", params), auth)
}

export function registerPosDevice(body) {
  return apiPost("/api/v1/pos-devices", body, auth)
}

export function updatePosDevice(id, body) {
  return apiPatch(`/api/v1/pos-devices/${id}`, body, auth)
}

export function listApprovalRequests(params = {}) {
  return apiGet(withQuery("/api/v1/approval-requests", params), auth)
}

export function reviewApprovalRequest(id, body) {
  return apiPatch(`/api/v1/approval-requests/${id}`, body, auth)
}

export function pinOverride(body) {
  return apiPost("/api/v1/approvals/pin-override", body, auth)
}

export function listAuditLogs(params = {}) {
  return apiGet(withQuery("/api/v1/audit-logs", params), auth)
}
