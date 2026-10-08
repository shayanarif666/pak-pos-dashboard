import { MapPin } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useLocationsQuery } from "../catalog/catalogQuery.jsx"
import { useSalesByLocationQuery } from "./orderQuery.js"
import { Currency } from "../../ui/Currency.jsx"
import { Select } from "../../ui/Select.jsx"

/** Only the store admin sees several branches; managers are already limited to their own. */
export function useIsStoreAdmin() {
  const { user } = useAuth()
  return user?.role === "store_admin"
}

export function LocationSelect({ value, onChange, label = "Location", className = "" }) {
  const isAdmin = useIsStoreAdmin()
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  if (!isAdmin) return null
  return (
    <Select label={label} className={className} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All locations</option>
      {(locationsQuery.data || []).map((row) => (
        <option key={row.id} value={row.id}>
          {row.name}
          {row.is_active === false ? " (inactive)" : ""}
        </option>
      ))}
    </Select>
  )
}

/**
 * Sales per branch (store admin): completed sales, order counts by outcome, refunds and net.
 * Clicking a row filters the list below to that branch; clicking it again clears the filter.
 */
export function LocationSalesSummary({ filters = {}, selected = "", onSelect }) {
  const isAdmin = useIsStoreAdmin()
  const query = useSalesByLocationQuery(
    {
      from: filters.from || undefined,
      to: filters.to || undefined,
      channel: filters.channel || undefined,
      payment_method: filters.payment_method || undefined,
    },
    { enabled: isAdmin }
  )
  if (!isAdmin) return null

  const rows = query.data?.locations || []
  const totals = query.data?.totals || {}

  return (
    <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Sales by location</h2>
          <p className="text-xs text-slate-500">
            Click a location to see only its orders{selected ? " · click again to show all" : ""}.
          </p>
        </div>
        {query.isFetching ? <span className="text-xs text-slate-400">Updating…</span> : null}
      </div>
      {query.error ? <p className="px-5 py-3 text-sm text-rose-700">{query.error.message}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Location</th>
              <th className="px-3 py-2.5 text-right font-semibold">Sales</th>
              <th className="px-3 py-2.5 text-right font-semibold">Completed</th>
              <th className="px-3 py-2.5 text-right font-semibold">Pending</th>
              <th className="px-3 py-2.5 text-right font-semibold">Cancelled / voided</th>
              <th className="px-3 py-2.5 text-right font-semibold">Refunded</th>
              <th className="px-3 py-2.5 text-right font-semibold">Refunds</th>
              <th className="px-5 py-2.5 text-right font-semibold">Net sales</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = selected && selected === row.location_id
              return (
                <tr
                  key={row.location_id || "none"}
                  onClick={() => row.location_id && onSelect?.(active ? "" : row.location_id)}
                  className={[
                    "border-t border-slate-100 transition",
                    row.location_id ? "cursor-pointer hover:bg-brand-50" : "",
                    active ? "bg-brand-50" : "",
                  ].join(" ")}
                >
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                      <MapPin className={`h-4 w-4 ${active ? "text-brand-700" : "text-slate-400"}`} aria-hidden="true" />
                      {row.location_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900"><Currency value={row.sales} /></td>
                  <td className="px-3 py-3 text-right text-slate-700">{row.completed_orders}</td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {row.pending_orders}
                    {row.pending_orders ? (
                      <span className="block text-xs text-slate-500"><Currency value={row.pending_amount} /></span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">{row.cancelled_orders}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{row.refunded_orders}</td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    <Currency value={row.refunds_amount} />
                    <span className="block text-xs text-slate-500">{row.refunds_count} refund(s)</span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-brand-700"><Currency value={row.net_sales} /></td>
                </tr>
              )
            })}
          </tbody>
          {rows.length > 1 ? (
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
              <tr>
                <td className="px-5 py-3">All locations</td>
                <td className="px-3 py-3 text-right"><Currency value={totals.sales || 0} /></td>
                <td className="px-3 py-3 text-right">{totals.completed_orders || 0}</td>
                <td className="px-3 py-3 text-right">{totals.pending_orders || 0}</td>
                <td className="px-3 py-3 text-right">{totals.cancelled_orders || 0}</td>
                <td className="px-3 py-3 text-right">{totals.refunded_orders || 0}</td>
                <td className="px-3 py-3 text-right"><Currency value={totals.refunds_amount || 0} /></td>
                <td className="px-5 py-3 text-right text-brand-700"><Currency value={totals.net_sales || 0} /></td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {!query.isPending && !rows.length ? (
        <p className="px-5 py-4 text-sm text-slate-500">No locations yet.</p>
      ) : null}
    </div>
  )
}
