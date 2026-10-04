import { apiDelete, apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listStores() {
  return apiGet("/api/v1/admin/stores", auth)
}

export function getStore(id) {
  return apiGet(`/api/v1/admin/stores/${id}`, auth)
}

export function createStore(body) {
  return apiPost("/api/v1/admin/stores", body, auth)
}

export function updateStore(id, body) {
  return apiPatch(`/api/v1/admin/stores/${id}`, body, auth)
}

export function listPlans() {
  return apiGet("/api/v1/plans", auth)
}

export function getPlan(id) {
  return apiGet(`/api/v1/plans/${id}`, auth)
}

export function createPlan(body) {
  return apiPost("/api/v1/plans", body, auth)
}

export function updatePlan(id, body) {
  return apiPatch(`/api/v1/plans/${id}`, body, auth)
}

export function deletePlan(id) {
  return apiDelete(`/api/v1/plans/${id}`, auth)
}

export function listLicenses() {
  return apiGet("/api/v1/admin/licenses", auth)
}

export function getLicense(id) {
  return apiGet(`/api/v1/admin/licenses/${id}`, auth)
}

export function createLicense(body) {
  return apiPost("/api/v1/admin/licenses", body, auth)
}

export function updateLicense(id, body) {
  return apiPatch(`/api/v1/admin/licenses/${id}`, body, auth)
}

export function revokeLicense(id, body) {
  return apiPost(`/api/v1/admin/licenses/${id}/revoke`, body, auth)
}

/** body: { plan_id, amount?, billing_status?, method_note?, note? } — also records the billing. */
export function renewLicense(id, body) {
  return apiPost(`/api/v1/admin/licenses/${id}/renew`, body, auth)
}

export function extendLicense(id) {
  return apiPost(`/api/v1/admin/licenses/${id}/extend`, {}, auth)
}

export function suspendLicense(id, body) {
  return apiPost(`/api/v1/admin/licenses/${id}/suspend`, body, auth)
}

export function activateLicense(id) {
  return apiPost(`/api/v1/admin/licenses/${id}/activate`, {}, auth)
}

export function listBillings(storeId) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : ""
  return apiGet(`/api/v1/admin/billings${query}`, auth)
}

export function createBilling(body) {
  return apiPost("/api/v1/admin/billings", body, auth)
}

export function updateBilling(id, body) {
  return apiPatch(`/api/v1/admin/billings/${id}`, body, auth)
}

export function listAdminAuditLogs(params = {}) {
  return apiGet(withQuery("/api/v1/admin/audit-logs", params), auth)
}

export function listAdminPosDevices(params = {}) {
  return apiGet(withQuery("/api/v1/admin/pos-devices", params), auth)
}

export function createAdminPosDevice(body) {
  return apiPost("/api/v1/admin/pos-devices", body, auth)
}
