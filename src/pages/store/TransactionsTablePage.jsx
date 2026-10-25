import { useState } from "react"
import { useTransactionsQuery } from "../../features/lists/listQueries.js"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { formatDateTime } from "../../ui/format.js"

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
]
const STATUSES = ["success", "initiated", "pending", "failed", "refunded"].map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

/** Transactions: one per payment of an order (paged by the API). */
export function TransactionsTablePage() {
  const { params: locationParams, isAll } = useDashboardLocation()
  const locationName = useLocationName()
  const [table, setTable] = useState({ page: 1, limit: 20, search: "", filters: {}, from: "", to: "" })

  const params = {
    ...locationParams,
    page: table.page,
    limit: table.limit,
    // The search box takes an order number.
    orderId: /^\d+$/.test(table.search) ? table.search : undefined,
    method: table.filters.method || undefined,
    status: table.filters.status || undefined,
    from: table.from || undefined,
    to: table.to ? `${table.to}T23:59:59` : undefined,
  }
  const query = useTransactionsQuery(params)
  const rows = query.data?.rows || []

  const columns = [
    { key: "id", header: "Transaction #", render: (row) => <span className="font-semibold text-slate-900">#{row.id}</span> },
    { key: "paid_at", header: "Date", render: (row) => formatDateTime(row.paid_at) },
    { key: "orderId", header: "Order #", render: (row) => (row.orderId ? `#${row.orderId}` : "—") },
    ...(isAll ? [{ key: "locationId", header: "Location", render: (row) => locationName(row.locationId) }] : []),
    { key: "method", header: "Method", render: (row) => <StatusBadge value={row.method} /> },
    { key: "amount", header: "Amount", align: "right", render: (row) => <span className="font-semibold"><Currency value={row.amount} /></span> },
    { key: "tax_amount", header: "Payment GST", align: "right", render: (row) => <Currency value={row.tax_amount} /> },
    { key: "reference", header: "Reference", render: (row) => row.reference || "—" },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Sales"
        title="Transactions"
        description="Every payment taken for an order — created with the order, one per payment method. Search by order number."
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        search={{ placeholder: "Order number…" }}
        filters={[
          { key: "method", label: "Method", options: METHODS },
          { key: "status", label: "Status", options: STATUSES },
        ]}
        dateRange={{ value: (row) => row.paid_at }}
        server={{ total: query.data?.pagination?.total || 0, onChange: setTable }}
        emptyText="No transactions yet."
      />
    </section>
  )
}
