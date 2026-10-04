import { apiGet, apiPut } from "../lib/http.js"

const auth = { auth: true }

export function getTaxRates() {
  return apiGet("/api/v1/tax-rates", auth)
}

export function putTaxRates(body) {
  return apiPut("/api/v1/tax-rates", body, auth)
}
