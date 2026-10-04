const SESSION_KEY = "dashboard.session"

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.access_token) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSession(data) {
  const current = readSession() || {}
  const next = {
    access_token: data.access_token ?? current.access_token ?? null,
    refresh_token: data.refresh_token ?? current.refresh_token ?? null,
    user: data.user ?? current.user ?? null,
    store: data.store !== undefined ? data.store : current.store ?? null,
    location: data.location !== undefined ? data.location : current.location ?? null,
    locations: data.locations !== undefined ? data.locations : current.locations ?? null,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(next))
  return next
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getAccessToken() {
  return readSession()?.access_token || null
}

export function getRefreshToken() {
  return readSession()?.refresh_token || null
}
