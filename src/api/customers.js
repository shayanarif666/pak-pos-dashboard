import { apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listCustomers(params = {}) {
  return apiGet(withQuery("/api/v1/customers", params), auth)
}

export function getCustomer(id) {
  return apiGet(`/api/v1/customers/${id}`, auth)
}

export function createCustomer(body) {
  return apiPost("/api/v1/customers", body, auth)
}

export function updateCustomer(id, body) {
  return apiPatch(`/api/v1/customers/${id}`, body, auth)
}
