import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useRefundsQuery } from "../../features/orders/orderQuery.js"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { DataTable, optionsFrom } from "../../ui/DataTable.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { formatDateTime, toNumber } from "../../ui/format.js"

const beforeTax = (row) => Number(row.amount || 0) - Number(row.tax_amount || 0)

/** Orders Refunds: complete (whole order) and partial (some items) refunds. */
export function RefundsTablePage() {
  const navigate = useNavigate()
  const { params, isAll } = useDashboardLocation()
  const locationName = useLocationName()
  const query = useRefundsQuery(params)
  const rows = useMemo(() => query.data || [], [query.data])

  const totals = useMemo(() => {
    const sum = (fn) => rows.reduce((acc, row) => acc + Number(fn(row) || 0), 0)
    return {
      count: rows.length,
      complete: rows.filter((row) => row.refund_type === "complete").length,
      total: sum((row) => row.amount),
      tax: sum((row) => row.tax_amount),
    }
  }, [rows])

  const columns = [
    { key: "refund_number", header: "Refund #", sortValue: (row) => Number(row.refund_number), render: (row) => <span className="font-semibold text-slate-900">#{row.refund_number ?? "—"}</span> },
    { key: "created_at", header: "Date", sortValue: (row) => new Date(row.created_at), render: (row) => formatDateTime(row.created_at) },
    { key: "order_number", header: "Order #", sortValue: (row) => Number(row.order_number), render: (row) => `#${row.order_number}` },
    ...(isAll ? [{ key: "location", header: "Location", sortValue: (row) => locationName(row.location_id), render: (row) => locationName(row.location_id) }] : []),
    { key: "refund_type", header: "Type", render: (row) => <StatusBadge value={row.refund_type || "partial"} /> },
    { key: "item_title", header: "Items", sortable: false, className: "max-w-56 truncate", render: (row) => row.item_title || "—" },
    { key: "quantity", header: "Qty", align: "right", sortValue: (row) => toNumber(row.quantity), render: (row) => row.quantity ?? "—" },
    { key: "amount_before_tax", header: "Amount", align: "right", sortValue: beforeTax, render: (row) => <Currency value={beforeTax(row)} /> },
    { key: "tax_amount", header: "Tax", align: "right", sortValue: (row) => toNumber(row.tax_amount), render: (row) => <Currency value={row.tax_amount} /> },
    { key: "amount", header: "Total refunded", align: "right", sortValue: (row) => toNumber(row.amount), render: (row) => <span className="font-semibold"><Currency value={row.amount} /></span> },
    { key: "reason", header: "Reason", sortable: false, render: (row) => row.reason || "—" },
    { key: "cashier", header: "By", sortValue: (row) => row.cashier?.name, render: (row) => row.cashier?.name || "—" },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Sales"
        title="Orders Refunds"
        description="Complete refunds give back a whole order; partial refunds give back some of its items. Click a row to open the order."
      />
      <StatCards
        items={[
          { label: "Refunds", value: totals.count },
          { label: "Complete / partial", value: `${totals.complete} / ${totals.count - totals.complete}` },
          { label: "Refunded", value: <Currency value={totals.total} /> },
          { label: "Tax returned", value: <Currency value={totals.tax} /> },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        search={{ placeholder: "Search order #, item or reason…", text: (row) => `#${row.order_number} ${row.item_title} ${row.reason} ${row.cashier?.name}` }}
        filters={[
          { key: "refund_type", label: "Type", options: [{ value: "complete", label: "Complete" }, { value: "partial", label: "Partial" }], match: (row, value) => (row.refund_type || "partial") === value },
          { key: "cashier", label: "By", options: optionsFrom(rows, (row) => row.cashier?.id, (id, row) => row.cashier?.name || id), match: (row, value) => row.cashier?.id === value },
        ]}
        dateRange={{ value: (row) => row.created_at }}
        initialSort={{ key: "created_at", dir: "desc" }}
        onRowClick={(row) => navigate(`/orders/${row.order_id}`)}
        emptyText="No refunds yet."
      />
    </section>
  )
}
