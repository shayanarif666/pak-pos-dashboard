import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BadgePercent,
  Ban,
  BarChart3,
  Boxes,
  CalendarClock,
  Clock,
  CreditCard,
  FolderTree,
  Gauge,
  Gift,
  Lock,
  MapPin,
  Package,
  Percent,
  Receipt,
  RotateCcw,
  ListFilter,
  Snail,
  Timer,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  Warehouse,
  AlertTriangle,
  Inbox,
  LogOut,
  Search,
  X,
} from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { getReportingOverview, getReportingSection } from "../../api/reports.js"
import { toDateInput } from "../../features/reports/dateRange.js"
import { BRAND, ChartCard, ColumnChart, ComparisonBars, HBarChart, Heatmap, ShareBar, methodColor } from "../../features/reports/ReportCharts.jsx"
import { columnLabel, columnsOf, flattenSummary, formatValue, isNumericKey, summaryLabel, toneOf } from "../../features/reporting/reportFormat.js"
import { useClockOut, useCloseBatch } from "../../features/lists/listQueries.js"
import { inputToIso, nowInput } from "../../features/lists/StaffLocationFields.jsx"
import { formatCurrency, formatNumber } from "../../ui/Currency.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { formatDateTime } from "../../ui/format.js"
import { unitShort } from "../../ui/units.js"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { humanize, sectionToTables } from "../../lib/exportFile.js"
import { Button } from "../../ui/Button.jsx"
import { Drawer } from "../../ui/Drawer.jsx"
import { ExportButton } from "../../ui/ExportButton.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { PageHeader, headerIconButton } from "../../ui/PageHeader.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { table as ui } from "../../ui/tableStyles.js"

/*
 * Reporting (GET /api/v1/reporting): the cards of the store plan's level — Basic, Standard,
 * Advanced; a card above the plan shows locked. One card is loaded at a time, for the dates
 * chosen (default: the last 7 days), and each of its tables is paged by the API.
 */

const ICONS = {
  sales: BarChart3,
  payments: CreditCard,
  batches: Receipt,
  top_products: Package,
  top_categories: FolderTree,
  refunds: RotateCcw,
  cancelled: Ban,
  locations: MapPin,
  inventory: Boxes,
  movements: ArrowLeftRight,
  transfers: Truck,
  discounts: BadgePercent,
  cashiers: UserRound,
  sessions: Clock,
  profit: TrendingUp,
  tax: Percent,
  comparison: CalendarClock,
  offers: Gift,
  dead_stock: Snail,
  forecast: Timer,
  peak_hours: Gauge,
  customers: Users,
  suppliers: Warehouse,
  variance: AlertTriangle,
}
const LEVEL_LABEL = { basic: "Basic", standard: "Standard", advanced: "Advanced" }
const LEVEL_TONE = {
  basic: "bg-slate-100 text-slate-700",
  standard: "bg-sky-50 text-sky-700",
  advanced: "bg-violet-50 text-violet-700",
}
const CHANNELS = [
  ["overall", "Overall"],
  ["web", "By Web"],
  ["pos", "By POS"],
]
// Charts read a card's full (small) lists.
const CHART_LIMIT = {
  sales: "all", payments: "all", peak_hours: "all", top_products: "all", top_categories: "all", profit: "all", locations: "all",
  tax: "all", cashiers: "all", offers: "all", discounts: "all", comparison: "all", forecast: "all", sessions: "all", batches: "all",
  suppliers: "all", variance: "all",
}
// Columns shown as a status badge.
const STATUS_KEYS = new Set(["status", "order_status", "payment_status", "type", "refund_type", "source_label"])

const weekAgo = () => {
  const date = new Date()
  date.setDate(date.getDate() - 6)
  return toDateInput(date)
}
const today = () => toDateInput(new Date())

/** One cell: badges for statuses, a small bar for a share, numbers with their unit. */
function Cell({ name, row, first }) {
  const value = row[name]
  if (STATUS_KEYS.has(name) && value != null && value !== "") return <StatusBadge value={String(value).toLowerCase()} />
  if ((name === "percent" || name === "margin_percent") && value != null) {
    const pct = Math.max(0, Math.min(100, Number(value)))
    return (
      <span className="inline-flex items-center justify-end gap-2">
        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: BRAND }} /></span>
        <span className="w-14 text-right">{formatValue(name, value, row)}</span>
      </span>
    )
  }
  const text = formatValue(name, value, row)
  return first ? <span className="font-semibold text-slate-900">{text}</span> : text
}

/** One table of a card, paged by the API. rowAction(row) adds a button column (Close batch…). */
function ReportTable({ section, name, base, search, title, rowAction }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const params = { ...base, table: name, page, limit, ...(search ? { search } : {}) }
  const query = useQuery({
    queryKey: ["reporting", section, "table", params],
    queryFn: async () => (await getReportingSection(section, params)).data,
    placeholderData: keepPreviousData,
  })
  const table = query.data?.tables?.[name] || { rows: [], pagination: { page: 1, total: 0, total_pages: 1 } }
  const rows = table.rows || []
  const columns = useMemo(() => columnsOf(rows), [rows])
  const { total, total_pages: pages } = table.pagination
  const hasActions = rowAction && rows.some((row) => rowAction(row))

  return (
    <div className={`${ui.card} ${query.isFetching && !query.isPending ? "opacity-70 transition-opacity" : ""}`}>
      <div className="flex items-center gap-2.5 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-slate-900">{title || "Details"}</h3>
        <span className={ui.count}>{total}</span>
      </div>
      <div className={ui.scroll}>
        {rows.length ? (
          <table className={`${ui.table} min-w-full`}>
            <thead className={ui.thead}>
              <tr>
                {columns.map((key) => (
                  <th key={key} className={`${ui.th} ${isNumericKey(key) ? "text-right" : ""}`}>{columnLabel(key)}</th>
                ))}
                {hasActions ? <th className={`${ui.th} text-right`}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className={ui.tr}>
                  {columns.map((key, col) => (
                    <td key={key} className={`${ui.td} whitespace-nowrap ${isNumericKey(key) ? "text-right tabular-nums" : ""} ${toneOf(key, row[key])}`}>
                      <Cell name={key} row={row} first={col === 0} />
                    </td>
                  ))}
                  {hasActions ? <td className={`${ui.td} whitespace-nowrap text-right`}>{rowAction(row)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={`${ui.empty} border-t border-slate-200/80`}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-700">{query.isPending ? "Loading…" : "Nothing in these dates."}</p>
          </div>
        )}
      </div>
      {total > 0 ? (
        <div className={ui.footer}>
          <label className="flex items-center gap-2">
            Rows
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }} className="select-ui h-9 rounded-xl border border-slate-200 bg-white pl-3 text-sm font-semibold text-slate-900 outline-none">
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <span className="tabular-nums text-slate-500">{(table.pagination.page - 1) * limit + 1}–{Math.min(total, table.pagination.page * limit)} of {total}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-9 px-3" disabled={page <= 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}>Prev</Button>
            <span className="tabular-nums">Page {table.pagination.page} of {pages}</span>
            <Button variant="ghost" className="h-9 px-3" disabled={page >= pages || query.isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const unitText = (row) => (row?.unit ? unitShort(row.unit) : "")
const qtyText = (value, row) => `${formatNumber(value, { maximumFractionDigits: 3 })}${unitText(row) ? ` ${unitText(row)}` : ""}`
const money = (value) => formatCurrency(value)
const hours = (value) => `${formatNumber(value, { maximumFractionDigits: 2 })} h`
const days = (value) => `${formatNumber(value)} day${Number(value) === 1 ? "" : "s"}`

/** Each card's charts, from its full (small) lists. */
function SectionCharts({ section, data }) {
  const tables = data?.tables || {}
  const rowsOf = (name) => tables[name]?.rows || []
  const summary = data?.summary || {}
  const methods = (rows) =>
    rows.map((row) => ({
      key: row.method,
      label: row.label || String(row.method || "").replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
      value: Number(row.net_amount ?? row.gross_amount ?? 0),
      color: methodColor(row.method),
      extra: [["Transactions", formatNumber(row.transactions || 0)], ["Surcharge", money(row.tax || 0)], ...(Number(row.refunds) ? [["Refunds", money(row.refunds)]] : [])],
    }))
  const salesExtra = (row) => [
    ["Net sales", money(row.net_sales)],
    ["Tax", money(row.tax)],
    ...(Number(row.discounts) ? [["Discounts", money(row.discounts)]] : []),
    ...(row.units_sold != null ? [["Qty sold", qtyText(row.units_sold, row)]] : []),
  ]

  switch (section) {
    case "sales":
      return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <ChartCard title="Sales by day" subtitle="Total sales (with tax) per day — hover a column for orders">
            <ColumnChart items={rowsOf("trend")} valueKey="sales" labelKey="bucket" extra={(row) => [["Orders", formatNumber(row.orders || 0)]]} />
          </ChartCard>
          <ChartCard title="Takings by payment method" subtitle="What each method brought in">
            <ShareBar items={methods(rowsOf("payments"))} />
          </ChartCard>
        </div>
      )
    case "payments":
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Share of takings"><ShareBar items={methods(rowsOf("rows"))} /></ChartCard>
          <ChartCard title="Net by method"><HBarChart items={methods(rowsOf("rows"))} /></ChartCard>
        </div>
      )
    case "top_products":
    case "top_categories": {
      const key = section === "top_products" ? "product" : "category"
      return (
        <ChartCard title={section === "top_products" ? "Top products by sales" : "Top categories by sales"} subtitle="Total sales with tax; hover for qty, tax and discounts">
          <HBarChart items={rowsOf("rows").map((row) => ({ label: row[key], sub: section === "top_products" ? `${row.category} · ${qtyText(row.units_sold, row)}` : `${formatNumber(row.units_sold)} sold`, value: Number(row.total_sales || 0), extra: salesExtra(row) }))} />
        </ChartCard>
      )
    }
    case "locations":
      return (
        <ChartCard title="Sales by location">
          <HBarChart items={rowsOf("rows").map((row) => ({ label: row.location?.name || "—", sub: `${formatNumber(row.orders)} orders`, value: Number(row.total_sales || 0), extra: [["Net sales", money(row.net_sales)], ["Tax", money(row.tax)], ["Refunds", money(row.refunds)]] }))} />
        </ChartCard>
      )
    case "cashiers":
      return (
        <ChartCard title="Sales by cashier">
          <HBarChart items={rowsOf("rows").map((row) => ({ label: row.cashier, sub: `${formatNumber(row.orders)} orders`, value: Number(row.total_sales || 0), extra: [["Discounts", money(row.discounts)], ["Tax", money(row.tax)], ["Refunds", money(row.refunds)]] }))} />
        </ChartCard>
      )
    case "profit":
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Gross profit by product" subtitle="Net sales − cost; hover for the margin">
            <HBarChart showShare={false} items={rowsOf("by_product").map((row) => ({ label: row.product, sub: `${row.category} · ${qtyText(row.units, row)}`, value: Number(row.gross_profit || 0), extra: [["Margin", `${formatNumber(row.margin_percent)}%`], ["Net sales", money(row.net_sales)], ["Cost", money(row.cost)]] }))} />
          </ChartCard>
          <ChartCard title="Gross profit by category">
            <HBarChart showShare={false} items={rowsOf("by_category").map((row) => ({ label: row.category, sub: `Margin ${formatNumber(row.margin_percent)}%`, value: Number(row.gross_profit || 0), extra: [["Net sales", money(row.net_sales)], ["Cost", money(row.cost)]] }))} />
          </ChartCard>
        </div>
      )
    case "tax":
      return (
        <ChartCard title="Tax collected by type">
          <HBarChart items={rowsOf("rows").map((row) => ({ label: row.tax_rule || columnLabel(row.id), value: Number(row.tax_collected || 0) }))} empty="No tax in these dates" />
        </ChartCard>
      )
    case "offers":
      return (
        <ChartCard title="Discount given by offer" subtitle="Hover for the sales and units it brought">
          <HBarChart items={rowsOf("rows").map((row) => ({ label: row.offer?.name || "Offer", sub: `${formatNumber(row.orders)} orders · ${formatNumber(row.units)} units`, value: Number(row.discount_given || 0), extra: [["Sales", money(row.sales)], ["Free units", formatNumber(row.free_units || 0)]] }))} empty="No offer used in these dates" />
        </ChartCard>
      )
    case "discounts":
      return (
        <ChartCard title="Discount given by discount">
          <HBarChart items={rowsOf("catalog").map((row) => ({ label: row.name, sub: `${row.amount} · ${formatNumber(row.used_orders || 0)} orders`, value: Number(row.discount_given || 0) }))} empty="No discount used in these dates" />
        </ChartCard>
      )
    case "peak_hours":
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Orders by hour" subtitle={summary.busiest_hour ? `Busiest: ${summary.busiest_hour} · ${summary.busiest_day}` : null}>
            <ColumnChart items={rowsOf("by_hour")} valueKey="orders" labelKey="hour" format={(v) => `${formatNumber(v)} orders`} axisFormat={(v) => formatNumber(v)} extra={(row) => [["Sales", money(row.sales)]]} />
          </ChartCard>
          <ChartCard title="Orders by hour and weekday" subtitle="Darker = busier">
            <Heatmap rows={rowsOf("by_hour")} />
          </ChartCard>
        </div>
      )
    case "comparison":
      return (
        <ChartCard title="These dates vs the dates before" subtitle={summary.previous_from ? `${summary.current_from} – ${summary.current_to} vs ${summary.previous_from} – ${summary.previous_to}` : null}>
          <ComparisonBars rows={rowsOf("rows")} />
        </ChartCard>
      )
    case "forecast":
      return (
        <ChartCard title="Running out first" subtitle="Days of stock left at the average daily sale">
          <HBarChart showShare={false} format={days} items={rowsOf("rows").filter((row) => row.days_left != null).sort((a, b) => a.days_left - b.days_left).slice(0, 10).map((row) => ({ label: row.product, sub: `${qtyText(row.stock, row)} in stock · ${qtyText(row.avg_daily_sales, row)} / day`, value: Math.max(0.5, Number(row.days_left)), extra: [["Days left", days(row.days_left)]] }))} empty="No product sold in these dates" />
        </ChartCard>
      )
    case "sessions":
      return (
        <ChartCard title="Hours worked by staff">
          <HBarChart format={hours} items={rowsOf("by_staff").map((row) => ({ label: row.staff, sub: `${String(row.role || "").replace("_", " ")} · ${formatNumber(row.sessions)} session${row.sessions === 1 ? "" : "s"}`, value: Number(row.hours_worked || 0) }))} empty="No sessions in these dates" />
        </ChartCard>
      )
    case "batches":
      return (
        <ChartCard title="Sales by batch" subtitle="Hover a column for its cash and variance">
          <ColumnChart
            items={[...rowsOf("rows")].reverse().map((row) => ({ ...row, label: `#${row.batch_number ?? row.session_id}` }))}
            valueKey="total_sales"
            labelKey="label"
            extra={(row) => [["Cashier", row.cashier], ["Orders", formatNumber(row.orders)], ["Cash sales", money(row.cash_sales)], ["Variance", money(row.variance)]]}
          />
        </ChartCard>
      )
    case "suppliers":
      return (
        <ChartCard title="Stock received by supplier">
          <HBarChart format={(v) => formatNumber(v)} items={rowsOf("rows").map((row) => ({ label: row.supplier, sub: `${formatNumber(row.purchases)} purchases`, value: Number(row.units_received || 0), extra: [["Balance owed", money(row.balance)]] }))} empty="No purchases in these dates" />
        </ChartCard>
      )
    case "variance": {
      const reasons = Object.entries(summary.loss_value_by_reason || {}).map(([reason, value]) => ({ label: columnLabel(reason), value: Number(value || 0) }))
      return (
        <ChartCard title="Stock losses by reason" subtitle="Cost value of damage, theft, expiry and waste">
          <HBarChart items={reasons} color="#e34948" empty="No losses in these dates" />
        </ChartCard>
      )
    }
    default:
      return null
  }
}

/**
 * The card's figures: single values as tiles (the first four larger), and each group of values
 * (taxes, payment surcharges, losses by reason…) as one card listing its non-zero parts.
 */
function SummaryCards({ summary }) {
  const tiles = []
  const groups = []
  const walk = (object, prefix = "") => {
    for (const [key, value] of Object.entries(object || {})) {
      if (key === "totals" && value && typeof value === "object") { walk(value, prefix); continue }
      if (key === "summary" && value && typeof value === "object") { walk(value, prefix); continue }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        groups.push({ key, rows: flattenSummary(value).filter(([, v]) => typeof v !== "object" && Number(v || 0) !== 0) })
      } else if (typeof value !== "boolean" && value !== null) {
        tiles.push([prefix ? `${prefix}.${key}` : key, value])
      }
    }
  }
  walk(summary)
  if (!tiles.length && !groups.length) return null
  return (
    <div className="space-y-4">
      {tiles.length ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map(([key, value], index) => (
            <div key={key} className={`min-w-0 rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${index < 4 ? "" : "bg-slate-50/60"}`}>
              <p className="truncate text-xs font-medium text-slate-500" title={summaryLabel(key)}>{summaryLabel(key)}</p>
              <p className={`mt-1 truncate font-semibold tabular-nums text-slate-950 ${index < 4 ? "text-xl" : "text-base"} ${toneOf(key, value)}`}>{formatValue(key, value)}</p>
            </div>
          ))}
        </div>
      ) : null}
      {groups.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div key={group.key} className="rounded-[20px] border border-slate-200/80 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{columnLabel(group.key)}</p>
              {group.rows.length ? (
                <dl className="mt-2 space-y-1.5">
                  {group.rows.map(([path, value]) => (
                    <div key={path} className="flex justify-between gap-3 text-sm">
                      <dt className="truncate text-slate-600">{summaryLabel(path)}</dt>
                      <dd className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{/(tax|discount|value|amount|sales|cash|surcharge|refund)/.test(group.key) ? money(value) : formatValue(path, value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-slate-400">None in these dates</p>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** The open card: its figures, charts and paged tables. */
function SectionView({ card, base, search }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const closeBatch = useCloseBatch()
  const clockOut = useClockOut()
  // Close batch: { row, cash, at }. Clock out: { row, at }.
  const [closing, setClosing] = useState(null)
  const [leaving, setLeaving] = useState(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["reporting"] })

  async function submitClose(event) {
    event.preventDefault()
    try {
      await closeBatch.mutateAsync({ staffId: closing.row.cashier_id, batch_id: closing.row.batch_number ?? closing.row.id, total_cash: Number(closing.cash || 0), closed_at: inputToIso(closing.at) })
      toast(`Batch #${closing.row.batch_number ?? closing.row.session_id} closed`)
      setClosing(null)
      refresh()
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function submitClockOut(event) {
    event.preventDefault()
    try {
      await clockOut.mutateAsync({ staffId: leaving.row.staff_number, ...(leaving.row.location_number ? { location_id: leaving.row.location_number } : {}), clocked_at: inputToIso(leaving.at) })
      toast(`${leaving.row.staff} clocked out`)
      setLeaving(null)
      refresh()
    } catch (err) {
      toast(err.message, "error")
    }
  }

  // Open batches can be closed and on-duty staff clocked out right from the report.
  const rowAction = (row) => {
    if (card.id === "batches" && String(row.status).toUpperCase() === "OPEN") {
      return (
        <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setClosing({ row, cash: "", at: nowInput() })}>
          <Lock className="h-3.5 w-3.5 text-amber-600" /> Close batch
        </Button>
      )
    }
    if (card.id === "sessions" && row.status === "on_duty" && row.staff_number != null) {
      return (
        <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setLeaving({ row, at: nowInput() })}>
          <LogOut className="h-3.5 w-3.5 text-amber-600" /> Clock out
        </Button>
      )
    }
    return null
  }

  const meta = useQuery({
    queryKey: ["reporting", card.id, "meta", base],
    queryFn: async () => (await getReportingSection(card.id, { ...base, limit: CHART_LIMIT[card.id] || 1 })).data,
  })
  if (meta.isPending) return <PageLoader label="Loading report…" />
  if (meta.error) {
    const locked = meta.error.status === 403
    return (
      <p className={`rounded-2xl border px-4 py-3 text-sm ${locked ? "border-violet-200 bg-violet-50 text-violet-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
        {meta.error.message}
      </p>
    )
  }
  const names = Object.keys(meta.data?.tables || {})
  return (
    <div className="space-y-6">
      <SummaryCards summary={meta.data?.summary} />
      <SectionCharts section={card.id} data={meta.data} />
      {meta.data?.summary?.top_only ? (
        <p className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          Basic plan: the top {meta.data.summary.shown} of {meta.data.summary.total} are shown. Upgrade to Standard to see every one.
        </p>
      ) : null}
      {names.map((name) => (
        <ReportTable
          key={`${name}|${JSON.stringify(base)}|${search}`}
          section={card.id}
          name={name}
          base={base}
          search={search}
          title={names.length === 1 ? card.label : humanize(name)}
          rowAction={["batches", "sessions"].includes(card.id) ? rowAction : null}
        />
      ))}

      <Modal open={Boolean(closing)} onClose={() => setClosing(null)} size="md">
        {closing ? (
          <ModalCard as="form" title={`Close batch #${closing.row.batch_number ?? closing.row.session_id}`} onClose={() => setClosing(null)} onSubmit={submitClose}>
            <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
              <dt className="text-slate-500">Cashier</dt><dd className="text-right font-medium text-slate-900">{closing.row.cashier}</dd>
              <dt className="text-slate-500">Opened</dt><dd className="text-right font-medium text-slate-900">{formatDateTime(closing.row.date_time)}</dd>
              <dt className="text-slate-500">Opening cash</dt><dd className="text-right font-medium text-slate-900">{money(closing.row.opening_amount)}</dd>
              <dt className="text-slate-500">Cash sales</dt><dd className="text-right font-medium text-slate-900">{money(closing.row.cash_sales)}</dd>
              <dt className="text-slate-500">Expected in drawer</dt><dd className="text-right font-semibold text-slate-950">{money(closing.row.expected_cash)}</dd>
            </dl>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input label="Cash counted in the drawer" type="number" min="0" step="0.01" required value={closing.cash} onChange={(e) => setClosing({ ...closing, cash: e.target.value })} />
              <Input label="Closed at" type="datetime-local" required value={closing.at} onChange={(e) => setClosing({ ...closing, at: e.target.value })} />
            </div>
            {closing.cash !== "" ? (
              <p className={`mt-2 text-sm ${Number(closing.cash) - Number(closing.row.expected_cash) < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                Variance: {money(Number(closing.cash) - Number(closing.row.expected_cash))}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setClosing(null)}>Cancel</Button>
              <Button type="submit" disabled={closeBatch.isPending}>{closeBatch.isPending ? "Closing…" : "Close batch"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>

      <Modal open={Boolean(leaving)} onClose={() => setLeaving(null)} size="md">
        {leaving ? (
          <ModalCard as="form" title={`Clock out ${leaving.row.staff}`} onClose={() => setLeaving(null)} onSubmit={submitClockOut}>
            <p className="text-sm text-slate-600">{leaving.row.location} · clocked in {formatDateTime(leaving.row.clock_in_at)}</p>
            <div className="mt-3 max-w-xs">
              <Input label="Clock out time" type="datetime-local" required value={leaving.at} onChange={(e) => setLeaving({ ...leaving, at: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setLeaving(null)}>Cancel</Button>
              <Button type="submit" disabled={clockOut.isPending}>{clockOut.isPending ? "Saving…" : "Clock out"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>
    </div>
  )
}

export function ReportingPage() {
  const { store } = useAuth()
  const { toast } = useToast()
  const scope = useDashboardLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [channel, setChannel] = useState("overall")
  const [range, setRange] = useState(() => ({ from: weekAgo(), to: today() }))
  const [draft, setDraft] = useState(range)
  const [search, setSearch] = useState("")
  const [draftSearch, setDraftSearch] = useState("")
  const [drawer, setDrawer] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const base = useMemo(
    () => ({
      location: scope.isAll ? "all" : scope.locationId || "all",
      from: range.from,
      to: range.to,
      ...(channel === "overall" ? {} : { channel }),
    }),
    [scope.isAll, scope.locationId, range, channel]
  )
  const overview = useQuery({
    queryKey: ["reporting", "overview", base],
    queryFn: async () => (await getReportingOverview(base)).data,
  })
  const cards = overview.data?.cards || []
  const level = overview.data?.plan?.reporting_level || "basic"
  const open = cards.find((card) => card.id === searchParams.get("report") && !card.locked) || null
  const unlocked = cards.filter((card) => !card.locked)

  function openCard(card) {
    if (card?.locked) {
      toast(`${card.label} is in the ${LEVEL_LABEL[card.level]} plan. Upgrade to see it.`, "error")
      return
    }
    const next = new URLSearchParams(searchParams)
    if (card) next.set("report", card.id)
    else next.delete("report")
    setSearchParams(next)
  }

  function apply() {
    if (draft.from && draft.to && draft.from > draft.to) {
      toast("Start date must be on or before the end date", "error")
      return
    }
    setRange(draft)
    setDrawer(false)
  }

  function reset() {
    const next = { from: weekAgo(), to: today() }
    setDraft(next)
    setRange(next)
  }

  /** Export: the chosen card (or every unlocked one), every row for these dates. */
  async function exportTables() {
    // The open report, or every unlocked one from the cards page.
    const picked = open ? [open] : unlocked
    const tables = []
    for (const card of picked) {
      const data = (await getReportingSection(card.id, { ...base, limit: "all" })).data
      const lists = Object.fromEntries(Object.entries(data.tables || {}).map(([name, table]) => [name, table.rows]))
      tables.push(...sectionToTables(card.label, { ...(data.summary || {}), ...lists }))
    }
    return tables
  }

  const datesChanged = range.from !== weekAgo() || range.to !== today()
  function openDrawer() {
    setDraft(range)
    setDrawer(true)
  }
  function closeSearch() {
    setDraftSearch("")
    setSearch("")
    setSearchOpen(false)
  }

  return (
    <section className="space-y-6">
      <PageHeader
        section="Reporting"
        back={
          open ? (
            <button
              type="button"
              onClick={() => openCard(null)}
              aria-label="Back to all reports"
              title="Back to all reports"
              className="mb-3 mr-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-brand-700 hover:text-brand-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {open ? open.label : "Reports"}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_TONE[level]}`}>{LEVEL_LABEL[level]} plan</span>
          </span>
        }
        description={`${store?.name ? `${store.name} · ` : ""}${scope.label} · ${range.from} to ${range.to}`}
        actions={
          <>
            <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {CHANNELS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={`h-full rounded-lg px-3 text-xs font-semibold transition ${channel === id ? "bg-brand-700 text-white" : "text-slate-600 hover:text-brand-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {searchOpen || search ? (
              <label className="relative inline-flex h-11 w-full items-center sm:w-64">
                <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-brand-700" />
                <input
                  autoFocus
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSearch(draftSearch.trim())
                    if (e.key === "Escape") closeSearch()
                  }}
                  placeholder="Search the tables… (Enter)"
                  className="h-11 w-full rounded-xl border border-brand-700 bg-white pl-10 pr-9 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-4 focus:ring-brand-700/10"
                />
                <button type="button" onClick={closeSearch} aria-label="Close search" className="absolute right-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </label>
            ) : (
              <button type="button" onClick={() => setSearchOpen(true)} title="Search" aria-label="Search" className={headerIconButton()}>
                <Search className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={openDrawer} title="Filters" aria-label="Filters" className={headerIconButton(datesChanged)}>
              <ListFilter className="h-5 w-5" />
            </button>
            <ExportButton getTables={exportTables} name={() => `report-${open ? open.id : "all"}-${range.from}-to-${range.to}`} disabled={!unlocked.length} />
          </>
        }
      />

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Filter reports"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button className="flex-1" onClick={apply}>Apply filter</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dates</p>
          <Input label="Start date" type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          <Input label="End date" type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          <p className="text-xs text-slate-500">Only these dates are loaded from the server. Default: the last 7 days.</p>
        </div>
      </Drawer>

      {overview.isPending ? <PageLoader label="Loading reports…" /> : null}
      {overview.error ? <p className="text-sm text-rose-700">{overview.error.message}</p> : null}

      {!open && cards.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = ICONS[card.id] || BarChart3
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => openCard(card)}
                className={`group relative flex flex-col rounded-[24px] border p-5 text-left transition ${
                  card.locked
                    ? "cursor-not-allowed border-dashed border-slate-300 bg-slate-50"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-700 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${card.locked ? "bg-slate-200 text-slate-400" : "bg-slate-100 text-slate-900 group-hover:bg-brand-700 group-hover:text-white"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEVEL_TONE[card.level]}`}>{LEVEL_LABEL[card.level]}</span>
                </div>
                <span className={`mt-4 text-base font-semibold ${card.locked ? "text-slate-500" : "text-slate-950"}`}>{card.label}</span>
                <span className="mt-1 flex-1 text-sm text-slate-500">{card.about}</span>
                {card.locked ? (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700">
                    <Lock className="h-4 w-4" /> Upgrade to {LEVEL_LABEL[card.level]}
                  </span>
                ) : (
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-950">
                    View report <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : null}

      {open ? <SectionView key={open.id} card={open} base={base} search={search} /> : null}
    </section>
  )
}
