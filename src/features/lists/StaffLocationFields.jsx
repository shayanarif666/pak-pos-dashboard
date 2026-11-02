import { useAuth } from "../../auth/AuthContext.jsx"
import { useLocationsQuery } from "../catalog/catalogQuery.jsx"
import { useStaffQuery } from "../operations/operationsQuery.js"
import { Select } from "../../ui/Select.jsx"

/**
 * Who (staff member) and where (location) for a dashboard batch / attendance action. A store admin
 * picks the location; a manager works at their own, so only the staff member is asked.
 * value = { staffId (user number), locationId (UUID) }.
 */
export function StaffLocationFields({ value, onChange }) {
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const staff = (useStaffQuery().data || []).filter((row) => row.is_active !== false)
  const locations = (useLocationsQuery({ enabled: isAdmin }).data || []).filter((row) => row.is_active !== false)
  // A manager's list: the staff at their location (and themselves).
  const shown = isAdmin ? staff : staff.filter((row) => row.location_id === user?.location_id || row.id === user?.id)
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select label="Staff member" required value={value.staffId} onChange={(e) => onChange({ ...value, staffId: e.target.value })}>
        <option value="">Select staff</option>
        {shown.map((row) => (
          <option key={row.id} value={String(row.user_number)}>
            {row.name} ({String(row.role).replace("_", " ")})
          </option>
        ))}
      </Select>
      {isAdmin ? (
        <Select label="Location" required value={value.locationId} onChange={(e) => onChange({ ...value, locationId: e.target.value })}>
          <option value="">Select location</option>
          {locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </Select>
      ) : null}
    </div>
  )
}

/** The body fields for the action: staffId, and the location for a store admin. */
export function staffLocationBody(value, isAdmin) {
  return { staffId: Number(value.staffId), ...(isAdmin && value.locationId ? { location_id: value.locationId } : {}) }
}
