import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { getMe, loginRequest, logoutRequest } from "../api/auth.js"
import { clearSession, readSession, writeSession } from "../lib/session.js"
import { ApiError, AUTH_EXPIRED_EVENT, LICENSE_BLOCKED_EVENT } from "../lib/http.js"
import { LicenseBlockedDialog } from "./LicenseBlockedDialog.jsx"
import { isDashboardRole, rejectedRoleMessage } from "./roles.js"

const AuthContext = createContext(null)

function sessionFromPayload(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
    store: data.store ?? null,
    location: data.location ?? null,
    locations: data.locations ?? null,
  }
}

function assertDashboardUser(user) {
  if (!user || !isDashboardRole(user.role)) {
    clearSession()
    throw new ApiError(rejectedRoleMessage(user?.role), { status: 403, body: { user } })
  }
}

export function AuthProvider({ children }) {
  const stored = readSession()
  const [ready, setReady] = useState(!stored?.access_token)
  const [session, setSession] = useState(stored)
  // Expired / suspended store license: a blocking alert whose only button signs the user out.
  const [licenseBlock, setLicenseBlock] = useState(null)

  const applySession = useCallback((data) => {
    const next = writeSession(sessionFromPayload(data))
    setSession(next)
    return next
  }, [])

  const signOut = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      clearSession()
      setSession(null)
    }
  }, [])

  const signIn = useCallback(
    async (body) => {
      const json = await loginRequest(body)
      const data = json.data
      assertDashboardUser(data?.user)
      return applySession(data)
    },
    [applySession]
  )

  useEffect(() => {
    let cancelled = false
    const current = readSession()
    if (!current?.access_token) {
      setReady(true)
      return
    }
    if (current.user && !isDashboardRole(current.user.role)) {
      clearSession()
      setSession(null)
      setReady(true)
      return
    }

    getMe()
      .then((json) => {
        if (cancelled) return
        const data = {
          ...current,
          user: json.data?.user,
          store: json.data?.store ?? null,
          location: json.data?.location ?? null,
          locations: json.data?.locations ?? null,
        }
        assertDashboardUser(data.user)
        applySession(data)
      })
      .catch(() => {
        if (cancelled) return
        clearSession()
        setSession(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [applySession])

  useEffect(() => {
    function onExpired() {
      clearSession()
      setSession(null)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  useEffect(() => {
    function onLicenseBlocked(event) {
      setLicenseBlock((current) => current || event.detail)
    }
    window.addEventListener(LICENSE_BLOCKED_EVENT, onLicenseBlocked)
    return () => window.removeEventListener(LICENSE_BLOCKED_EVENT, onLicenseBlocked)
  }, [])

  const acknowledgeLicenseBlock = useCallback(async () => {
    setLicenseBlock(null)
    await signOut()
  }, [signOut])

  const value = useMemo(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      store: session?.store ?? null,
      location: session?.location ?? null,
      locations: session?.locations ?? null,
      signIn,
      signOut,
    }),
    [ready, session, signIn, signOut]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LicenseBlockedDialog block={licenseBlock} onConfirm={acknowledgeLicenseBlock} />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
