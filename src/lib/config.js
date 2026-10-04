/**
 * Dashboard talks to the Express API via VITE_API_BASE_URL.
 * Hosts without a scheme (e.g. foo.up.railway.app) get https://.
 */
export function resolveApiBase(raw = import.meta.env.VITE_API_BASE_URL) {
  let base = String(raw || "").trim().replace(/\/$/, "")
  if (!base) return ""
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`
  }
  return base.replace(/\/$/, "")
}

export const API_BASE_URL = resolveApiBase()
