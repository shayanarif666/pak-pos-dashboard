import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { listCancelledOrders, listCustomOrders, listOrders } from "../../api/orders.js"
import { orderKeys } from "../../features/orders/orderQuery.js"
import { unwrap } from "../../lib/query.js"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
import { DataTable, optionsFrom } from "../../ui/DataTable.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { formatDateTime, PAYMENT_METHOD_OPTIONS, toNumber } from "../../ui/format.js"

const MODES = {
  history: {
    title: "Orders History",
    description: "Every sale with its discounts, taxes and payment. Click an order for its items, payments and refunds.",
  },
  custom: {
    title: "Custom Sales",
    description: "Sales rung up without catalog products (custom lines with their own title and price).",
  },
  cancelled: {
    title: "Orders Cancelled",
    description: "Voided and cancelled sales, with the reason and who did it.",
  },
}

const STATUS_OPTIONS = ["completed", "pending", "refunded", "voided", "cancelled"].map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

const discountOf = (row) =>
  Number(row.line_discount_amount || 0) + Number(row.discount_amount || 0) + Number(row.coupon_discount_amount || 0)

/** Orders History / Custom Sales / Orders Cancelled: one table, three lists. */
export function OrdersTablePage({ mode = "history" }) {
  const navigate = useNavigate()
  const { params, isAll } = useDashboardLocation()
  const locationName = useLocationName()
  const staffName = useStaffNames()

  // Only the list of this page is fetched (same cache keys as the rest of the dashboard).
  const query = useQuery({
    queryKey: mode === "custom" ? orderKeys.custom(params) : mode === "cancelled" ? orderKeys.cancelled(params) : orderKeys.list(params),
    queryFn: async () => {
      const request = mode === "custom" ? listCustomOrders : mode === "cancelled" ? listCancelledOrders : listOrders
      return unwrap(await request(params))
    },
  })
  const rows = useMemo(() => {
    const data = query.data
    return (mode === "cancelled" ? data?.orders : data) || []
  }, [query.data, mode])

  const totals = useMemo(() => {
    // Voided / cancelled sales never went through: only the Cancelled list adds them up.
    const counted = mode === "cancelled" ? rows : rows.filter((row) => !["voided", "cancelled"].includes(row.order_status))
    const sum = (fn) => counted.reduce((acc, row) => acc + Number(fn(row) || 0), 0)
    return {
      orders: counted.length,
      total: sum((row) => row.total_amount),
      discount: sum(discountOf),
      tax: sum((row) => row.tax_amount),
    }
  }, [rows, mode])

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
    ...(mode === "history"
      ? [{ key: "type", header: "Type", sortValue: (row) => (row.is_custom ? 1 : 0), render: (row) => <StatusBadge value={row.is_custom ? "custom" : "catalog"} /> }]
      : []),
    { key: "payment_method", header: "Payment", render: (row) => <StatusBadge value={row.payment_method} /> },
    { key: "gross_amount", header: "Gross", align: "right", sortValue: (row) => toNumber(row.gross_amount), render: (row) => <Currency value={row.gross_amount} /> },
    { key: "discount", header: "Discount", align: "right", sortValue: discountOf, render: (row) => <Currency value={discountOf(row)} /> },
    { key: "tax_amount", header: "Tax", align: "right", sortValue: (row) => toNumber(row.tax_amount), render: (row) => <Currency value={row.tax_amount} /> },
    { key: "total_amount", header: "Total", align: "right", sortValue: (row) => toNumber(row.total_amount), render: (row) => <span className="font-semibold"><Currency value={row.total_amount} /></span> },
    ...(mode === "cancelled"
      ? [{ key: "reason", header: "Reason", sortable: false, render: (row) => row.void_reason || row.cancel_reason || "—" }]
      : [
          { key: "amount_paid", header: "Paid", align: "right", sortValue: (row) => toNumber(row.amount_paid), render: (row) => <Currency value={row.amount_paid} /> },
          { key: "change_due", header: "Change", align: "right", sortValue: (row) => toNumber(row.change_due), render: (row) => <Currency value={row.change_due} /> },
        ]),
    { key: "order_status", header: "Status", render: (row) => <StatusBadge value={row.order_status} /> },
  ]

  const filters = [
    ...(mode !== "cancelled" ? [{ key: "order_status", label: "Status", options: STATUS_OPTIONS }] : [
      { key: "order_status", label: "Status", options: STATUS_OPTIONS.filter((o) => ["voided", "cancelled"].includes(o.value)) },
    ]),
    { key: "payment_method", label: "Payment", options: PAYMENT_METHOD_OPTIONS },
    ...(mode === "history"
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
      <PageHeader section="Sales" title={MODES[mode].title} description={MODES[mode].description} />
      <StatCards
        items={[
          { label: mode === "cancelled" ? "Cancelled orders" : "Orders", value: totals.orders },
          { label: mode === "cancelled" ? "Lost sales" : "Total sales", value: <Currency value={totals.total} /> },
          { label: "Discounts", value: <Currency value={totals.discount} /> },
          { label: "Tax", value: <Currency value={totals.tax} /> },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        search={{ placeholder: "Search order # or cashier…", text: (row) => `#${row.order_number} ${row.order_number} ${staffName(row.cashier_id)}` }}
        filters={filters}
        dateRange={{ label: "Sale date", value: (row) => row.placed_at }}
        initialSort={{ key: "placed_at", dir: "desc" }}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyText={mode === "cancelled" ? "No cancelled or voided orders." : "No orders yet."}
      />
    </section>
  )
}
