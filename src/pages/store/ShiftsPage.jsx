import { useMemo, useState } from "react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useRegisterSessionsQuery, useStaffQuery } from "../../features/operations/operationsQuery.js"
import { useStoreLocationsQuery } from "../../features/people/peopleQuery.js"
import { Currency } from "../../ui/Currency.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

// Cashiers clock in / out on the desktop POS; the dashboard only reviews the drawer history.
export function ShiftsPage() {
  const { user } = useAuth()
  const isAdmin = user.role === "store_admin"
  const [locationId, setLocationId] = useState("")
  const [status, setStatus] = useState("")
  const locationsQuery = useStoreLocationsQuery({ enabled: isAdmin })
  const staffQuery = useStaffQuery()
  const historyQuery = useRegisterSessionsQuery({
    ...(isAdmin && locationId ? { location_id: locationId } : {}),
    ...(status ? { status } : {}),
  })
  const rows = historyQuery.data || []
  const locations = locationsQuery.data || []

  const nameOf = useMemo(() => {
    const staff = new Map((staffQuery.data || []).map((row) => [row.id, row.name]))
    return (id) => staff.get(id) || "—"
  }, [staffQuery.data])
  const locationOf = useMemo(() => {
    const map = new Map(locations.map((row) => [row.id, row.name]))
    return (id) => map.get(id) || ""
  }, [locations])

  const open = rows.filter((row) => row.status === "clock_in").length
  const shortTotal = rows.reduce((sum, row) => sum + Math.min(0, Number(row.cash_variance || 0)), 0)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Point of sale</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Shift history</h1>
          <p className="mt-1 text-sm text-slate-500">Cash drawer sessions from the POS counters: sales, expected cash and variance.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin ? (
            <Select label="Location" className="min-w-52" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">All locations</option>
              {locations.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </Select>
          ) : null}
          <Select label="Status" className="min-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All shifts</option>
            <option value="clock_in">Open</option>
            <option value="clock_out">Closed</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Shifts" value={rows.length} />
        <Summary label="Open now" value={open} />
        <Summary label="Cash short (total)" value={<Currency value={shortTotal} signed />} />
      </div>

      {historyQuery.isPending ? <PageLoader label="Loading shifts…" /> : null}
      {historyQuery.error ? <p className="text-sm text-rose-700">{historyQuery.error.message}</p> : null}

      <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Cashier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Expected cash</th>
              <th className="px-4 py-3">Counted</th>
              <th className="px-4 py-3">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row) => {
              const variance = row.cash_variance == null ? null : Number(row.cash_variance)
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{nameOf(row.cashier_id)}</p>
                    {isAdmin ? <p className="text-xs text-slate-500">{locationOf(row.location_id)}</p> : null}
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={row.status === "clock_in" ? "open" : "closed"} /></td>
                  <td className="px-4 py-3">{new Date(row.opened_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{row.closed_at ? new Date(row.closed_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3"><Currency value={row.total_sales} /></td>
                  <td className="px-4 py-3"><Currency value={row.expected_cash} /></td>
                  <td className="px-4 py-3"><Currency value={row.closing_cash ?? undefined} /></td>
                  <td className="px-4 py-3">
                    {variance == null ? (
                      "—"
                    ) : (
                      <StatusBadge
                        tone={variance < 0 ? "rose" : variance > 0 ? "amber" : "emerald"}
                        value={variance === 0 ? "balanced" : undefined}
                      >
                        {variance === 0 ? null : <Currency value={variance} signed />}
                      </StatusBadge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!historyQuery.isPending && !rows.length ? <p className="px-4 py-6 text-sm text-slate-500">No shifts yet.</p> : null}
      </div>
    </section>
  )
}

function Summary({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}
