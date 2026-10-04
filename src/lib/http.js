import { API_BASE_URL } from "./config.js"
import { clearSession, getAccessToken, getRefreshToken, writeSession } from "./session.js"

export function apiUrl(path) {
  const next = path.startsWith("/") ? path : `/${path}`
  if (!API_BASE_URL) {
    return next
  }
  return `${API_BASE_URL}${next}`
}

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status ?? 0
    this.body = body ?? null
  }
}

export const AUTH_EXPIRED_EVENT = "auth:expired"
/** Fired when the API says the store license is expired or suspended (detail: { code, message }). */
export const LICENSE_BLOCKED_EVENT = "license:blocked"
export const LICENSE_BLOCK_CODES = ["LICENSE_EXPIRED", "LICENSE_SUSPENDED"]

export function licenseBlockCode(error) {
  const code = error?.body?.data?.code
  return LICENSE_BLOCK_CODES.includes(code) ? code : null
}

let refreshInFlight = null

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refresh_token = getRefreshToken()
    if (!refresh_token) return null

    const json = await apiRequest("/api/v1/auth/refresh", {
      method: "POST",
      body: { refresh_token },
      auth: false,
      _retry: true,
    })
    writeSession(json.data || {})
    return json.data?.access_token || null
  })()
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null
    })

  return refreshInFlight
}

export function withQuery(path, params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    token,
    auth = false,
    _retry = false,
  } = options

  const isForm = typeof FormData !== "undefined" && body instanceof FormData
  const headers = { Accept: "application/json" }
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json"

  const access = token ?? (auth ? getAccessToken() : null)
  if (access) headers.Authorization = `Bearer ${access}`

  let response
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      API_BASE_URL
        ? `Cannot reach the API at ${API_BASE_URL}`
        : "VITE_API_BASE_URL is missing"
    )
  }

  if (response.status === 401 && auth && !_retry) {
    const nextToken = await refreshAccessToken()
    if (nextToken) {
      return apiRequest(path, { ...options, token: nextToken, _retry: true })
    }
    clearSession()
    // Let AuthProvider drop its in-memory session too, so the app returns to /login.
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }

  let json = null
  try {
    json = await response.json()
  } catch {
    throw new ApiError("API returned a non-JSON response", { status: response.status })
  }

  if (response.status === 403 && LICENSE_BLOCK_CODES.includes(json?.data?.code)) {
    window.dispatchEvent(
      new CustomEvent(LICENSE_BLOCKED_EVENT, {
        detail: { code: json.data.code, message: json.message },
      })
    )
  }

  if (!response.ok || json?.success === false) {
    throw new ApiError(json?.message || `Request failed (${response.status})`, {
      status: response.status,
      body: json,
    })
  }

  return json
}

export function apiGet(path, options) {
  return apiRequest(path, { ...options, method: "GET" })
}

export function apiPost(path, body, options) {
  return apiRequest(path, { ...options, method: "POST", body })
}

export function apiPatch(path, body, options) {
  return apiRequest(path, { ...options, method: "PATCH", body })
}

export function apiDelete(path, options) {
  return apiRequest(path, { ...options, method: "DELETE" })
}

export function apiPut(path, body, options) {
  return apiRequest(path, { ...options, method: "PUT", body })
}
