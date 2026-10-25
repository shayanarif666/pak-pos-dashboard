import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useLocationsQuery } from "../catalog/catalogQuery.jsx"

const STORAGE_KEY = "dashboard.location"
const LocationContext = createContext(null)

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || ""
  } catch {
    return ""
  }
}

/**
 * The location every store page reads. A store admin picks "All locations" ("") or one location
 * (remembered across pages and reloads); a manager is always on their own location.
 */
export function DashboardLocationProvider({ children }) {
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const isStore = isAdmin || user?.role === "manager"
  const locationsQuery = useLocationsQuery({ enabled: isStore })
  const locations = locationsQuery.data || []
  const [picked, setPicked] = useState(readStored)

  // Forget a stored location that no longer exists (e.g. another store signed in).
  useEffect(() => {
    if (!isAdmin || !picked || locationsQuery.isPending) return
    if (!locations.some((row) => row.id === picked)) setPicked("")
  }, [isAdmin, picked, locations, locationsQuery.isPending])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, picked)
    } catch {
      // Storage blocked: the choice simply is not remembered.
    }
  }, [picked])

  const value = useMemo(() => {
    const locationId = isAdmin ? picked : user?.location_id || ""
    const location = locations.find((row) => row.id === locationId) || null
    return {
      isAdmin,
      locations,
      locationId,
      location,
      isAll: isAdmin && !locationId,
      label: location?.name || (isAdmin ? "All locations" : "My location"),
      setLocationId: isAdmin ? setPicked : () => {},
      /** Query params for list APIs: { location_id } when one location is chosen. */
      params: locationId ? { location_id: locationId } : {},
    }
  }, [isAdmin, picked, locations, user?.location_id])

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useDashboardLocation() {
  const value = useContext(LocationContext)
  if (!value) throw new Error("useDashboardLocation must be used inside DashboardLocationProvider")
  return value
}

/** Header control: store admin chooses a location; a manager sees theirs. */
export function LocationScopeSwitcher({ className = "" }) {
  const { isAdmin, locations, locationId, setLocationId, label } = useDashboardLocation()
  if (!isAdmin) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ${className}`}>
        <MapPin className="h-4 w-4 text-brand-700" />
        {label}
      </span>
    )
  }
  return (
    <label className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 ${className}`}>
      <MapPin className="h-4 w-4 shrink-0 text-brand-700" />
      <span className="sr-only">Location</span>
      <select
        className="max-w-56 bg-transparent py-0.5 font-medium outline-none"
        value={locationId}
        onChange={(event) => setLocationId(event.target.value)}
      >
        <option value="">All locations</option>
        {locations.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
            {row.is_active === false ? " (inactive)" : ""}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Location name for a location UUID (tables show names, not ids). */
export function useLocationName() {
  const { locations } = useDashboardLocation()
  return useMemo(() => {
    const byId = new Map(locations.map((row) => [row.id, row.name]))
    const byNumber = new Map(locations.map((row) => [Number(row.location_number), row.name]))
    return (idOrNumber) =>
      byId.get(idOrNumber) || byNumber.get(Number(idOrNumber)) || (idOrNumber ? String(idOrNumber) : "—")
  }, [locations])
}
