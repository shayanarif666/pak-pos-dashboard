import { apiGet, apiUrl, withQuery, ApiError } from "../lib/http.js"
import { getAccessToken, getRefreshToken, clearSession, writeSession } from "../lib/session.js"

const auth = { auth: true }

export function getDashboardReport(params = {}) {
  return apiGet(withQuery("/api/v1/reports/dashboard", params), auth)
}

export function getSalesReport(params = {}) {
  return apiGet(withQuery("/api/v1/reports/sales", params), auth)
}

export function getPaymentsReport(params = {}) {
  return apiGet(withQuery("/api/v1/reports/payments", params), auth)
}

export function getBreakdownReport(params = {}) {
  return apiGet(withQuery("/api/v1/reports/breakdown", params), auth)
}

export function getProfitReport(params = {}) {
  return apiGet(withQuery("/api/v1/reports/profit", params), auth)
}

async function refreshAccessToken() {
  const refresh_token = getRefreshToken()
  if (!refresh_token) return null
  const response = await fetch(apiUrl("/api/v1/auth/refresh"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  })
  const json = await response.json().catch(() => null)
  if (!response.ok || json?.success === false) return null
  writeSession(json.data || {})
  return json.data?.access_token || null
}

/** Binary download for GET /reports/export (csv / xlsx / pdf). */
export async function downloadReportExport(params = {}) {
  const path = withQuery("/api/v1/reports/export", params)
  const headers = { Accept: "*/*" }
  let access = getAccessToken()
  if (access) headers.Authorization = `Bearer ${access}`

  let response = await fetch(apiUrl(path), { method: "GET", headers })
  if (response.status === 401) {
    access = await refreshAccessToken()
    if (!access) {
      clearSession()
      throw new ApiError("Session expired", { status: 401 })
    }
    headers.Authorization = `Bearer ${access}`
    response = await fetch(apiUrl(path), { method: "GET", headers })
  }

  if (!response.ok) {
    let message = `Export failed (${response.status})`
    try {
      const json = await response.json()
      message = json?.message || message
    } catch {
      /* binary error body */
    }
    throw new ApiError(message, { status: response.status })
  }

  const blob = await response.blob()
  const disposition = response.headers.get("Content-Disposition") || ""
  const match = /filename="?([^"]+)"?/i.exec(disposition)
  const filename = match?.[1] || `report.${params.format || "csv"}`
  return { blob, filename }
}
