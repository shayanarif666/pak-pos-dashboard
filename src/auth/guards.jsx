import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext.jsx"
import { isStoreStaff } from "./roles.js"
import { PageLoader } from "../ui/Spinner.jsx"

function BootScreen() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PageLoader label="Restoring session…" />
    </div>
  )
}

export function GuestOnly() {
  const { ready, user } = useAuth()
  if (!ready) return <BootScreen />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireAuth() {
  const { ready, user } = useAuth()
  const location = useLocation()
  if (!ready) return <BootScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RequireRole({ roles }) {
  const { user } = useAuth()
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireStoreStaff() {
  const { user } = useAuth()
  if (!isStoreStaff(user?.role)) return <Navigate to="/" replace />
  return <Outlet />
}
