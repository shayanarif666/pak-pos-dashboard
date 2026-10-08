import { apiDelete, apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listStockMovements(params = {}) {
  return apiGet(withQuery("/api/v1/stock-movements", params), auth)
}

export function createStockMovement(body) {
  return apiPost("/api/v1/stock-movements", body, auth)
}

export function listStockTransfers() {
  return apiGet("/api/v1/stock-transfers", auth)
}

export function createStockTransfer(body) {
  return apiPost("/api/v1/stock-transfers", body, auth)
}

export function completeStockTransfer(id) {
  return apiPost(`/api/v1/stock-transfers/${id}/complete`, {}, auth)
}

export function cancelStockTransfer(id) {
  return apiPost(`/api/v1/stock-transfers/${id}/cancel`, {}, auth)
}

/** params.location_id: only suppliers that deliver to that branch (store admin filter). */
export function listSuppliers(params = {}) {
  return apiGet(withQuery("/api/v1/suppliers", params), auth)
}

export function getSupplier(id) {
  return apiGet(`/api/v1/suppliers/${id}`, auth)
}

export function createSupplier(body) {
  return apiPost("/api/v1/suppliers", body, auth)
}

export function updateSupplier(id, body) {
  return apiPatch(`/api/v1/suppliers/${id}`, body, auth)
}

export function deleteSupplier(id) {
  return apiDelete(`/api/v1/suppliers/${id}`, auth)
}

export function listSupplierLedger(id) {
  return apiGet(`/api/v1/suppliers/${id}/ledger`, auth)
}

export function addSupplierLedger(id, body) {
  return apiPost(`/api/v1/suppliers/${id}/ledger`, body, auth)
}
