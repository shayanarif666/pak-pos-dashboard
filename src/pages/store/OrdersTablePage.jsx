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
import { Pill, StatusBadge } from "../../ui/Pill.jsx"
import { methodLabel } from "../../features/orders/orderView.js"
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

  const nowrap = "whitespace-nowrap"
  const columns = [
    {
      key: "order_number",
      header: "Order",
      sortValue: (row) => Number(row.order_number),
      render: (row) => (
        <div className={nowrap}>
          <p className="font-semibold text-slate-900">#{row.order_number}</p>
          <p className="text-xs text-slate-500">{row.local_receipt_number || (row.batch?.id != null ? `Batch #${row.batch.id}` : row.channel?.toUpperCase())}</p>
        </div>
      ),
    },
    {
      key: "placed_at",
      header: "Date",
      sortValue: (row) => new Date(row.placed_at),
      render: (row) => <span className={nowrap}>{formatDateTime(row.placed_at)}</span>,
    },
    {
      key: "people",
      header: isAll ? "Location · Cashier" : "Cashier",
      sortValue: (row) => staffName(row.cashier_id),
      render: (row) => (
        <div className={nowrap}>
          <p className="font-medium text-slate-900">{staffName(row.cashier_id)}</p>
          {isAll ? <p className="text-xs text-slate-500">{locationName(row.location_id)}</p> : null}
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortValue: (row) => row.customer?.name || "",
      render: (row) =>
        row.customer ? (
          <div className={nowrap}>
            <p className="font-medium text-slate-900">{row.customer.name}</p>
            {row.customer.phone ? <p className="text-xs text-slate-500">{row.customer.phone}</p> : null}
          </div>
        ) : (
          <span className="text-slate-400">Walk-in</span>
        ),
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      sortValue: (row) => Number(row.item_count || 0),
      render: (row) => (
        <div className={`${nowrap} flex flex-col items-end gap-1`}>
          <span className="font-medium">{row.item_count ?? "—"}</span>
          {row.is_custom ? <Pill tone="amber">Custom</Pill> : row.custom_item_count ? <span className="text-xs text-amber-700">{row.custom_item_count} custom</span> : null}
        </div>
      ),
    },
    {
      key: "payment_method",
      header: "Payment",
      render: (row) => (
        <div className={nowrap}>
          <p className="font-medium text-slate-900">{methodLabel(row.payment_method)}</p>
          <p className="text-xs capitalize text-slate-500">{row.payment_status}</p>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      sortValue: discountOf,
      render: (row) => (discountOf(row) > 0 ? <span className={`${nowrap} text-rose-700`}>−<Currency value={discountOf(row)} /></span> : <span className="text-slate-400">—</span>),
    },
    { key: "tax_amount", header: "Tax", align: "right", sortValue: (row) => toNumber(row.tax_amount), render: (row) => <span className={nowrap}><Currency value={row.tax_amount} /></span> },
    {
      key: "total_amount",
      header: "Total",
      align: "right",
      sortValue: (row) => toNumber(row.total_amount),
      render: (row) => (
        <div className={nowrap}>
          <p className="font-semibold text-slate-950"><Currency value={row.total_amount} /></p>
          {!cancelled && Number(row.change_due) > 0 ? (
            <p className="text-xs text-slate-500">Paid <Currency value={row.amount_paid} /> · change <Currency value={row.change_due} /></p>
          ) : null}
        </div>
      ),
    },
    ...(cancelled ? [{ key: "reason", header: "Reason", sortable: false, render: (row) => row.void_reason || row.cancel_reason || "—" }] : []),
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
        search={{ placeholder: "Search order #, receipt, cashier or customer…", text: (row) => `#${row.order_number} ${row.order_number} ${row.local_receipt_number || ""} ${staffName(row.cashier_id)} ${row.customer?.name || ""} ${row.customer?.phone || ""}` }}
        filters={filters}
        dateRange={{ label: "Sale date", value: (row) => row.placed_at }}
        initialSort={{ key: "placed_at", dir: "desc" }}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyText={cancelled ? "No cancelled or voided orders." : "No orders here yet."}
      />
    </section>
  )
}
