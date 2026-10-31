/**
 * Dashboard talks to the Express API: `npm run dev` to the local API, the deployed build to
 * production. VITE_API_BASE_URL overrides either. Hosts without a scheme get https://.
 */
const PRODUCTION_API = "https://pak-pos-backend.onrender.com"
const LOCAL_API = "http://localhost:5000"

export function resolveApiBase(
  raw = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? LOCAL_API : PRODUCTION_API)
) {
  let base = String(raw || "").trim().replace(/\/$/, "")
  if (!base) return ""
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`
  }
  return base.replace(/\/$/, "")
}

export const API_BASE_URL = resolveApiBase()
