import { apiGet, apiPost } from "../lib/http.js"
import { getAccessToken } from "../lib/session.js"

export function loginRequest(body) {
  return apiPost("/api/v1/auth/login", body, { auth: false })
}

export function getMe() {
  return apiGet("/api/v1/auth/me", { auth: true })
}

export function logoutRequest() {
  const token = getAccessToken()
  if (!token) return Promise.resolve()
  return apiPost("/api/v1/auth/logout", {}, { auth: true }).catch(() => null)
}
