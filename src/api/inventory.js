import { apiDelete, apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listStockMovements(params = {}) {
  return apiGet(withQuery("/api/v1/stock-movements", params), auth)
}

export function createStockMovement(body) {
  return apiPost("/api/v1/stock-movements", body, auth)
}

/** Fix wrong movements: items = [{ id (movement number), movement_type?, reason?, qty?, reason_note? }]. */
export function updateStockMovements(items) {
  return apiPatch("/api/v1/stock-movements/bulk", { items }, auth)
}

/** Soft delete a wrong movement; its qty is taken back off the stock. */
export function deleteStockMovement(id) {
  return apiDelete(`/api/v1/stock-movements/${id}`, auth)
}

/**
 * Stock edits: items = [{ product_id (number), variant_id?, location_id (number), qty | number_of_packs
 * (+ loose_units), expiry_date?, low_stock_threshold?, reason?, reason_note? }].
 */
export function updateStocks(items) {
  return apiPatch("/api/v1/product-stocks/bulk", { items }, auth)
}

/** Soft delete a stock entry (its qty goes to 0 through an adjustment movement). */
export function deleteStockEntry(id, { product_id, variant_id, location_id } = {}) {
  // A lot number is the product's own: say which product (and location) in the query.
  const query = new URLSearchParams()
  if (product_id) query.set("product_id", product_id)
  if (variant_id) query.set("variant_id", variant_id)
  if (location_id) query.set("location_id", location_id)
  const qs = query.toString()
  return apiDelete(`/api/v1/product-stocks/${id}${qs ? `?${qs}` : ""}`, auth)
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

/** Update transfers: items = [{ id (transfer number), from_location_id?, note?, destinations? }] — the create shape. */
export function updateStockTransfers(items) {
  return apiPatch("/api/v1/stock-transfers/bulk", { items }, auth)
}

/** Soft delete a transfer nothing of which was received yet (id = transfer number). */
export function deleteStockTransfer(transferNumber) {
  return apiDelete(`/api/v1/stock-transfers/${transferNumber}`, auth)
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

/** Bulk Stock Movements: { staffId?, items: [{ product_id, movement_type, reason, variants | stock, … }] }. */
export function createStockMovementsBulk(body) {
  return apiPost("/api/v1/stock-movements/bulk", body, auth)
}
