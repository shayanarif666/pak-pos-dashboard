/**
 * Dashboard talks to the Express API: `npm run dev` to the local API, the deployed build to
 * production. VITE_API_BASE_URL overrides either. Hosts without a scheme get https://.
 */
const PRODUCTION_API = "https://pak-pos-backend.onrender.com"
const LOCAL_API = "http://localhost:5000"
// The API moved from Railway to Render; a host still set to the Railway URL uses the default.
const RETIRED_HOSTS = ["pak-pos-backend-production.up.railway.app"]

function configuredBase() {
  const value = String(import.meta.env.VITE_API_BASE_URL || "").trim()
  if (!value || RETIRED_HOSTS.some((host) => value.includes(host))) {
    return import.meta.env.DEV ? LOCAL_API : PRODUCTION_API
  }
  return value
}

export function resolveApiBase(raw = configuredBase()) {
  let base = String(raw || "").trim().replace(/\/$/, "")
  if (!base) return ""
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`
  }
  return base.replace(/\/$/, "")
}

export const API_BASE_URL = resolveApiBase()
