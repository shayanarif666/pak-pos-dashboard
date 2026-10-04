import { apiGet } from "../lib/http.js"

const auth = { auth: true }

export function listStoreBillings() {
  return apiGet("/api/v1/billings", auth)
}

export function getCurrentLicense() {
  return apiGet("/api/v1/licenses/me", auth)
}

export function listStoreLicenses() {
  return apiGet("/api/v1/licenses", auth)
}
