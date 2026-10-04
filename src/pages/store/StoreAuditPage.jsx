import { useMemo, useState } from "react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { AUDIT_ACTIONS, AuditLogsTable } from "../../features/audit/AuditLogsTable.jsx"
import { useAuditLogsQuery, useStoreLocationsQuery } from "../../features/people/peopleQuery.js"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"

export function StoreAuditPage() {
  const { store, user, location } = useAuth()
  const [action, setAction] = useState("")
  const [entityType, setEntityType] = useState("")
  const [locationId, setLocationId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const isAdmin = user?.role === "store_admin"
  const isManager = user?.role === "manager"

  const filters = useMemo(
    () => ({
      action: action || undefined,
      entity_type: entityType.trim() || undefined,
      location_id: isAdmin ? locationId || undefined : undefined,
      from: from || undefined,
      to: to || undefined,
      limit: 200,
    }),
    [action, entityType, locationId, from, to, isAdmin]
  )

  const auditQuery = useAuditLogsQuery(filters)
  const locationsQuery = useStoreLocationsQuery({ enabled: isAdmin })
  const rows = auditQuery.data || []
  const locations = locationsQuery.data || []

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Audit logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          {store?.name ? `${store.name} · ` : ""}
          {isManager
            ? `Location-scoped activity for ${location?.name || "your location"} (secrets redacted).`
            : "Store-wide activity trail (secrets redacted)."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </Select>
        <Input
          label="Entity type"
          placeholder="orders, products…"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
        {isAdmin ? (
          <Select
            label="Location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">All locations</option>
            {locations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {auditQuery.isPending ? <PageLoader label="Loading audit logs…" /> : null}
      {auditQuery.error ? (
        <p className="text-sm text-rose-700">{auditQuery.error.message}</p>
      ) : null}

      <AuditLogsTable rows={rows} loading={auditQuery.isPending} />
    </section>
  )
}
