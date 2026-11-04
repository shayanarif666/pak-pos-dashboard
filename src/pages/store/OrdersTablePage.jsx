import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { listOrders } from "../../api/orders.js"
import { orderKeys } from "../../features/orders/orderQuery.js"
import { unwrap } from "../../lib/query.js"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
import { DataTable, optionsFrom } from "../../ui/DataTable.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { Tabs, useTabParam } from "../../ui/Tabs.jsx"
import { ExportButton } from "../../ui/ExportButton.jsx"
import { rowsToTables } from "../../lib/exportFile.js"
import { formatDateTime, PAYMENT_METHOD_OPTIONS, toNumber } from "../../ui/format.js"

// Orders History tabs: [key, label, which orders, what the tab is about].
const TABS = [
  ["all", "All", () => true, "Every sale with its discounts, taxes and payment. Click an order for its items, payments and refunds."],
  ["pending", "Pending", (row) => row.order_status === "pending", "Sales started but not finished yet."],
  ["completed", "Completed", (row) => row.order_status === "completed", "Finished sales with nothing given back."],
  ["partial_refunded", "Partial Refunded", (row) => row.order_status === "partial_refunded", "Sales where some items were refunded; the rest of the sale stands."],
  ["refunded", "Refunded", (row) => row.order_status === "refunded", "Sales refunded in full."],
  ["cancelled", "Cancelled", (row) => ["voided", "cancelled"].includes(row.order_status), "Voided and cancelled sales, with the reason and who did it."],
  ["custom", "Custom", (row) => row.is_custom, "Sales rung up without catalog products (custom lines with their own title and price)."],
]
const NOT_SOLD = ["voided", "cancelled"]

const PAYMENT_STATUS_OPTIONS = ["paid", "partial", "pending", "refunded"].map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

const discountOf = (row) =>
  Number(row.line_discount_amount || 0) + Number(row.discount_amount || 0) + Number(row.coupon_discount_amount || 0)

/** Orders History: every order, split into tabs by status (and custom sales). */
export function OrdersTablePage() {
  const navigate = useNavigate()
  const { params, isAll } = useDashboardLocation()
  const locationName = useLocationName()
  const staffName = useStaffNames()

  const [tab, setTab] = useTabParam(TABS)
  const query = useQuery({
    queryKey: orderKeys.list(params),
    queryFn: async () => unwrap(await listOrders(params)),
  })
  const all = useMemo(() => query.data || [], [query.data])
  const current = TABS.find(([key]) => key === tab) || TABS[0]
  const cancelled = tab === "cancelled"
  const rows = useMemo(() => all.filter(current[2]), [all, current])
  const counts = useMemo(() => Object.fromEntries(TABS.map(([key, , match]) => [key, all.filter(match).length])), [all])

  const totals = useMemo(() => {
    // Voided / cancelled sales never went through: only the Cancelled list adds them up.
    const counted = cancelled ? rows : rows.filter((row) => !NOT_SOLD.includes(row.order_status))
    const sum = (fn) => counted.reduce((acc, row) => acc + Number(fn(row) || 0), 0)
    return {
      orders: counted.length,
      total: sum((row) => row.total_amount),
      discount: sum(discountOf),
      tax: sum((row) => row.tax_amount),
    }
  }, [rows, cancelled])

  // Export: every order at the chosen location(s), every field, with the location and cashier names.
  const exportTables = () =>
    rowsToTables(
      "Orders",
      all.map((row) => ({
        order_number: row.order_number,
        placed_at: row.placed_at,
        location: locationName(row.location_id),
        cashier: staffName(row.cashier_id),
        ...row,
      }))
    )

  const columns = [
    {
      key: "order_number",
      header: "Order #",
      sortValue: (row) => Number(row.order_number),
      render: (row) => <span className="font-semibold text-slate-900">#{row.order_number}</span>,
    },
    { key: "placed_at", header: "Date", sortValue: (row) => new Date(row.placed_at), render: (row) => formatDateTime(row.placed_at) },
    ...(isAll
      ? [{ key: "location", header: "Location", sortValue: (row) => locationName(row.location_id), render: (row) => locationName(row.location_id) }]
      : []),
    { key: "cashier", header: "Cashier", sortValue: (row) => staffName(row.cashier_id), render: (row) => staffName(row.cashier_id) },
    ...(tab === "all"
      ? [{ key: "type", header: "Type", sortValue: (row) => (row.is_custom ? 1 : 0), render: (row) => <StatusBadge value={row.is_custom ? "custom" : "catalog"} /> }]
      : []),
    { key: "payment_method", header: "Payment", render: (row) => <StatusBadge value={row.payment_method} /> },
    { key: "gross_amount", header: "Gross", align: "right", sortValue: (row) => toNumber(row.gross_amount), render: (row) => <Currency value={row.gross_amount} /> },
    { key: "discount", header: "Discount", align: "right", sortValue: discountOf, render: (row) => <Currency value={discountOf(row)} /> },
    { key: "tax_amount", header: "Tax", align: "right", sortValue: (row) => toNumber(row.tax_amount), render: (row) => <Currency value={row.tax_amount} /> },
    { key: "total_amount", header: "Total", align: "right", sortValue: (row) => toNumber(row.total_amount), render: (row) => <span className="font-semibold"><Currency value={row.total_amount} /></span> },
    ...(cancelled
      ? [{ key: "reason", header: "Reason", sortable: false, render: (row) => row.void_reason || row.cancel_reason || "—" }]
      : [
          { key: "amount_paid", header: "Paid", align: "right", sortValue: (row) => toNumber(row.amount_paid), render: (row) => <Currency value={row.amount_paid} /> },
          { key: "change_due", header: "Change", align: "right", sortValue: (row) => toNumber(row.change_due), render: (row) => <Currency value={row.change_due} /> },
        ]),
    { key: "order_status", header: "Status", render: (row) => <StatusBadge value={row.order_status} /> },
  ]

  const filters = [
    ...(cancelled
      ? [{ key: "order_status", label: "Status", options: [{ value: "voided", label: "Voided" }, { value: "cancelled", label: "Cancelled" }] }]
      : [{ key: "payment_status", label: "Payment status", options: PAYMENT_STATUS_OPTIONS }]),
    { key: "payment_method", label: "Payment", options: PAYMENT_METHOD_OPTIONS },
    ...(tab === "all"
      ? [{ key: "type", label: "Type", options: [{ value: "catalog", label: "Catalog" }, { value: "custom", label: "Custom" }], match: (row, value) => (row.is_custom ? "custom" : "catalog") === value }]
      : []),
    {
      key: "cashier",
      label: "Cashier",
      options: optionsFrom(rows, (row) => row.cashier_id, (id) => staffName(id)),
      match: (row, value) => row.cashier_id === value,
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Sales"
        title="Orders History"
        description={current[3]}
        actions={<ExportButton name="orders" getTables={exportTables} disabled={query.isPending} />}
      />
      <Tabs
        tabs={TABS.map(([key, label]) => [key, `${label} (${counts[key] ?? 0})`])}
        value={tab}
        onChange={setTab}
      />
      <StatCards
        items={[
          { label: cancelled ? "Cancelled orders" : "Orders", value: totals.orders },
          { label: cancelled ? "Lost sales" : "Total sales", value: <Currency value={totals.total} /> },
          { label: "Discounts", value: <Currency value={totals.discount} /> },
          { label: "Tax", value: <Currency value={totals.tax} /> },
        ]}
      />
      <DataTable
        title={current[0] === "all" ? "All orders" : `${current[1]} orders`}
        columns={columns}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        search={{ placeholder: "Search order # or cashier…", text: (row) => `#${row.order_number} ${row.order_number} ${staffName(row.cashier_id)}` }}
        filters={filters}
        dateRange={{ label: "Sale date", value: (row) => row.placed_at }}
        initialSort={{ key: "placed_at", dir: "desc" }}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyText={cancelled ? "No cancelled or voided orders." : "No orders here yet."}
      />
    </section>
  )
}
