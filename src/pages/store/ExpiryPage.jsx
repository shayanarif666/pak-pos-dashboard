import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useExpiryQuery, useLocationsQuery } from "../../features/catalog/catalogQuery.jsx"
import { resolveDashboardLocation } from "../../features/catalog/dashboardLocation.js"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

const STATUSES = ["expired", "critical", "warning", "ok"]

function expiryTone(status) {
  if (status === "expired") return "rose"
  if (status === "critical") return "amber"
  if (status === "warning") return "violet"
  return "emerald"
}

export function ExpiryPage() {
  const auth = useAuth()
  const isAdmin = auth.user.role === "store_admin"
  const tokenLocation = resolveDashboardLocation(auth)
  const expiryQuery = useExpiryQuery()
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const [status, setStatus] = useState("")
  const [locationId, setLocationId] = useState(isAdmin ? "" : tokenLocation?.id || "")
  const rows = expiryQuery.data || []
  const locations = locationsQuery.data || []

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (status && row.expiry_status !== status) return false
      const loc = locationId || (!isAdmin ? tokenLocation?.id : "")
      if (loc && row.location_id !== loc) return false
      return true
    })
  }, [rows, status, locationId, isAdmin, tokenLocation?.id])

  const counts = useMemo(() => {
    return STATUSES.reduce((acc, key) => {
      acc[key] = rows.filter((row) => row.expiry_status === key).length
      return acc
    }, {})
  }, [rows])

  if (expiryQuery.isPending) return <PageLoader label="Loading expiry…" />

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Expiry Manager</h1>
      <p className="mt-1 text-sm text-slate-500">
        Status is computed from each location’s stock expiry date. It is not posted by the client.
      </p>

      {expiryQuery.error ? (
        <p className="mt-4 text-sm text-rose-700">{expiryQuery.error.message}</p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {STATUSES.map((key) => (
          <article key={key} className="rounded-[24px] border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{key}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{counts[key] || 0}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </Select>
        {isAdmin ? (
          <Select label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visible.map((row) => (
          <article
            key={`${row.id}-${row.location_id}-${row.expiry_date}`}
            className="rounded-[28px] border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/products/${row.id}`} className="text-lg font-semibold text-slate-900 hover:text-brand-700">
                  {row.title}
                </Link>
                <p className="text-xs text-slate-500">SKU {row.sku}</p>
              </div>
              <StatusBadge value={row.expiry_status} tone={expiryTone(row.expiry_status)} />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Expires {row.expiry_date} · Qty {row.stocks?.[0]?.qty ?? "—"}
            </p>
            <p className="text-xs text-slate-500">Location {row.location_number || row.location_id}</p>
          </article>
        ))}
      </div>
      {!visible.length ? <p className="mt-8 text-sm text-slate-500">No expiry rows match this filter.</p> : null}
    </section>
  )
}
