import { apiDelete, apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

// Store taxes (Taxes page): { name, type, value, product_scope: all | selected, product_ids }.
export function listTaxes(params = {}) {
  return apiGet(withQuery("/api/v1/taxes", params), auth)
}

export function createTax(body) {
  return apiPost("/api/v1/taxes", body, auth)
}

// id: the tax number or UUID.
export function updateTax(id, body) {
  return apiPatch(`/api/v1/taxes/${id}`, body, auth)
}

export function deleteTax(id) {
  return apiDelete(`/api/v1/taxes/${id}`, auth)
}
