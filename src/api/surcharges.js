import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/http.js"

const auth = { auth: true }

// Payment method surcharges: { method, charges, type: percentage | fixed, is_active }.
export function listSurcharges() {
  return apiGet("/api/v1/payment-surcharges", auth)
}

export function createSurcharge(body) {
  return apiPost("/api/v1/payment-surcharges", body, auth)
}

// id: the surcharge number or UUID.
export function updateSurcharge(id, body) {
  return apiPatch(`/api/v1/payment-surcharges/${id}`, body, auth)
}

export function deleteSurcharge(id) {
  return apiDelete(`/api/v1/payment-surcharges/${id}`, auth)
}
