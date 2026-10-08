import { Link } from "react-router-dom"
import { useMemo, useState } from "react"
import { Eye } from "lucide-react"
import {
  useCancelledOrdersQuery,
  useCustomOrdersQuery,
  useOrdersQuery,
} from "../../features/orders/orderQuery.js"
import { LocationSalesSummary, LocationSelect } from "../../features/orders/LocationSales.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { Pill, StatusBadge } from "../../ui/Pill.jsx"

const titles = {
  all: {
    label: "Sales",
    title: "Orders",
    description: "Web and POS sales history with filters and receipt/payment detail.",
  },
  custom: {
    label: "Sales",
    title: "Custom Sales",
    description: "Orders created with custom typed lines instead of catalog stock lines.",
  },
  cancelled: {
    label: "Sales",
    title: "Cancelled Orders",
    description: "Cancelled, voided, and fully refunded order history.",
  },
}

/**
 * status: order_status filter (History tabs). embedded: render inside another page without the
 * title block. locationId: branch chosen by the parent page (History); when it is not passed the
 * page shows its own location filter and the "Sales by location" summary (store admin only).
 */
export function OrdersPage({ mode = "all", status = "", embedded = false, locationId }) {
  const [form, setForm] = useState({
    q: "",
    channel: "",
    payment_method: "",
    from: "",
    to: "",
  })
  const [filters, setFilters] = useState({})
  const [ownLocation, setOwnLocation] = useState("")
  const controlled = locationId !== undefined
  const location = controlled ? locationId : ownLocation
  const scoped = location ? { ...filters, location_id: location } : filters

  const ordersQuery = useOrdersQuery(status ? { ...scoped, status } : scoped)
  const customQuery = useCustomOrdersQuery(scoped)
  const cancelledQuery = useCancelledOrdersQuery(scoped)
  const query = mode === "custom" ? customQuery : mode === "cancelled" ? cancelledQuery : ordersQuery
  const rows = mode === "cancelled" ? query.data?.orders || [] : query.data || []
  const meta = titles[mode] || titles.all
  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    [rows]
  )

  function applyFilters(event) {
    event.preventDefault()
    setFilters({
      q: form.q.trim(),
      channel: form.channel,
      payment_method: form.payment_method,
      from: form.from,
      to: form.to,
    })
  }

  return (
    <section>
      <div className={embedded ? "hidden" : "mb-6"}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{meta.label}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{meta.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
      </div>

      {!controlled ? (
        <LocationSalesSummary filters={filters} selected={ownLocation} onSelect={setOwnLocation} />
      ) : null}

      <form onSubmit={applyFilters} className="mb-6 grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 md:grid-cols-3">
        {!controlled ? <LocationSelect value={ownLocation} onChange={setOwnLocation} /> : null}
        <Input label="Search" placeholder="Order # or customer" value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} />
        <Select label="Channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
          <option value="">All</option>
          <option value="web">Web</option>
          <option value="pos">POS</option>
        </Select>
        <Select label="Payment method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
          <option value="">All</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">Easypaisa</option>
          <option value="cod">COD</option>
          <option value="mixed">Mixed</option>
        </Select>
        <Input label="From" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
        <Input label="To" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
        <div className="flex items-end">
          <Button type="submit" variant="ghost">Filter</Button>
        </div>
      </form>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Summary label="Count" value={mode === "cancelled" ? query.data?.count || rows.length : rows.length} />
        <Summary
          label={mode === "cancelled" ? "Lost sales" : "Total sales"}
          value={
            <Currency
              value={mode === "cancelled" ? query.data?.lost_sales || 0 : total}
            />
          }
        />
        <Summary label="Current filter" value={form.channel || "all channels"} />
      </div>

      {query.isPending ? <PageLoader label="Loading orders…" /> : null}
      {query.error ? <p className="mb-4 text-sm text-rose-700">{query.error.message}</p> : null}

      <div className="grid gap-3">
        {rows.map((row) => (
          <Link
            key={row.id}
            to={`/orders/${row.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-brand-300 hover:bg-brand-50"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">Order #{row.order_number}</p>
                <StatusBadge value={row.channel} />
                {row.is_custom ? <Pill tone="amber">Custom</Pill> : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {row.placed_at ? new Date(row.placed_at).toLocaleString() : ""} ·{" "}
                {row.payment_method} · <Currency value={row.total_amount} />
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={row.order_status} />
              <StatusBadge value={row.payment_status} />
              <Eye className="h-4 w-4 text-slate-600" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
      {!query.isPending && !rows.length ? <p className="mt-8 text-sm text-slate-500">No orders found.</p> : null}
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
