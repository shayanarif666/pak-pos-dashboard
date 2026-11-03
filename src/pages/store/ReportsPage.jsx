import { useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BadgePercent,
  Ban,
  BarChart3,
  Boxes,
  Clock,
  CreditCard,
  Download,
  FolderTree,
  MapPin,
  Package,
  Percent,
  Receipt,
  RotateCcw,
  Truck,
  UserRound,
} from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "../../auth/AuthContext.jsx"
import { rangeForPreset, toDateInput } from "../../features/reports/dateRange.js"
import {
  ChartCard,
  ColumnChart,
  DonutChart,
  HBarChart,
} from "../../features/reports/ReportCharts.jsx"
import { useExportReport, useScopedReportQuery } from "../../features/reports/reportQuery.js"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { useStaffSessionsQuery } from "../../features/lists/listQueries.js"
import { formatCurrency, formatNumber } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

// One card per report; "locations" only when every location is shown together.
const REPORT_TABS = [
  { id: "sales", label: "Sales Summary", icon: BarChart3, about: "Orders, gross and net sales, discounts, taxes, profit and the sales trend." },
  { id: "locations", label: "By Location", icon: MapPin, about: "How much each location sold, its taxes, refunds and share.", allOnly: true },
  { id: "products", label: "By Products", icon: Package, about: "Units and sales of every product, with discounts and taxes." },
  { id: "categories", label: "By Categories", icon: FolderTree, about: "Sales of each category and its share of the total." },
  { id: "payments", label: "Payments", icon: CreditCard, about: "Cash, card, JazzCash and EasyPaisa: takings, payment tax and refunds." },
  { id: "inventory", label: "Inventory", icon: Boxes, about: "Stock on hand with what came in and went out in the range." },
  { id: "movements", label: "Stock Movements", icon: ArrowLeftRight, about: "Every stock in / out with its location, reason and who did it." },
  { id: "transfers", label: "Stock Transfers", icon: Truck, about: "Stock sent between locations: what left, what arrived and what is on the way." },
  { id: "discounts", label: "Discounts", icon: BadgePercent, about: "Every discount given on the sales, as it was at the sale: product, category, offer, order and coupon." },
  { id: "batches", label: "Z-Reports (Batches)", icon: Receipt, about: "Each batch: takings per method, expected vs counted cash." },
  { id: "sessions", label: "Sessions History", icon: Clock, about: "Staff clock in / clock out and hours worked, per session and per staff member." },
  { id: "refunds", label: "Refunded Orders", icon: RotateCcw, about: "Complete and partial refunds with amounts and reasons." },
  { id: "cancelled", label: "Cancelled Orders", icon: Ban, about: "Voided and cancelled sales and the sales lost." },
  { id: "cashiers", label: "By Cashier", icon: UserRound, about: "Orders, sales, discounts and refunds per staff member." },
  { id: "tax", label: "Tax Breakdown", icon: Percent, about: "Sales, product, category and payment-method tax collected." },
]

const CHANNEL_TABS = [
  { id: "overall", label: "Overall" },
  { id: "web", label: "By Web" },
  { id: "pos", label: "By POS" },
]

/** "7h 05m" from milliseconds. */
function hoursText(ms) {
  if (!(ms > 0)) return "0h 00m"
  const minutes = Math.round(ms / 60000)
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
}

const workedMs = (row) => (row.opening_at ? (row.closing_at ? new Date(row.closing_at) : new Date()) - new Date(row.opening_at) : 0)

/** Sessions History for the range: totals per staff member, then every session. */
function SessionsReport({ from, to, locationId }) {
  const query = useStaffSessionsQuery({
    page: 1,
    limit: 200,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(locationId ? { location_id: locationId } : {}),
  })
  const rows = query.data?.rows || []
  const byStaff = new Map()
  for (const row of rows) {
    const key = row.staff?.id ?? "—"
    const entry = byStaff.get(key) || { staff: row.staff?.name || "—", role: row.staff?.role || "", sessions: 0, ms: 0, onDuty: false }
    entry.sessions += 1
    entry.ms += workedMs(row)
    entry.onDuty = entry.onDuty || !row.closing_at
    byStaff.set(key, entry)
  }
  const total = query.data?.pagination?.total ?? rows.length
  if (query.isPending) return <PageLoader label="Loading sessions…" />
  if (query.error) return <p className="text-sm text-rose-700">{query.error.message}</p>
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Sessions" value={formatNumber(total)} hint={total > rows.length ? `First ${rows.length} shown` : undefined} />
        <StatCard label="Hours worked" value={hoursText(rows.reduce((sum, row) => sum + workedMs(row), 0))} />
        <StatCard label="On duty now" value={rows.filter((row) => !row.closing_at).length} />
      </div>
      <DataTable
        columns={[
          { key: "staff", label: "Staff", render: (row) => <span className="font-medium text-slate-900">{row.staff}</span> },
          { key: "role", label: "Role", render: (row) => String(row.role).replace("_", " ") || "—" },
          { key: "sessions", label: "Sessions" },
          { key: "ms", label: "Hours worked", render: (row) => hoursText(row.ms) },
          { key: "avg", label: "Avg per session", render: (row) => hoursText(row.sessions ? row.ms / row.sessions : 0) },
          { key: "onDuty", label: "Now", render: (row) => <StatusBadge value={row.onDuty ? "clock_in" : "clock_out"} /> },
        ]}
        rows={[...byStaff.values()]}
        empty="No sessions in this range"
      />
      <DataTable
        columns={[
          { key: "id", label: "Session #", render: (row) => `#${row.id}` },
          { key: "staff", label: "Staff", render: (row) => row.staff?.name || "—" },
          { key: "location", label: "Location", render: (row) => row.location?.name || "—" },
          { key: "opening_at", label: "Clock in", render: (row) => (row.opening_at ? new Date(row.opening_at).toLocaleString() : "—") },
          { key: "closing_at", label: "Clock out", render: (row) => (row.closing_at ? new Date(row.closing_at).toLocaleString() : "—") },
          { key: "worked", label: "Worked", render: (row) => hoursText(workedMs(row)) },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
        ]}
        rows={rows}
        empty="No sessions in this range"
      />
    </div>
  )
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

function DataTable({ columns, rows, empty = "No rows for this range" }) {
  if (!rows?.length) {
    return <p className="py-8 text-center text-sm text-slate-500">{empty}</p>
  }
  return (
    <div className="overflow-x-auto rounded-[24px] border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-[0.14em] text-slate-500">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id || row.bucket || row.method || row.product || row.category || index}
              className="border-b border-slate-200"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-800">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BarList({ items, valueKey = "net_amount", labelKey = "method" }) {
  return <HBarChart items={items} valueKey={valueKey} labelKey={labelKey} />
}

function formatDate(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function ChannelBar({ value, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
      {CHANNEL_TABS.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onChange(row.id)}
          className={[
            "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition",
            value === row.id
              ? "bg-brand-700 text-white"
              : "text-slate-600 hover:text-brand-700",
          ].join(" ")}
        >
          {row.label}
        </button>
      ))}
    </div>
  )
}

const monthStart = () => {
  const now = new Date()
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
}
const today = () => toDateInput(new Date())

export function ReportsPage() {
  const { user, store } = useAuth()
  const { toast } = useToast()
  // The open report lives in ?report= (none = the cards), so Back and reloads work.
  const [searchParams, setSearchParams] = useSearchParams()
  const [channelTab, setChannelTab] = useState("overall")
  // Start / end date only; opens on this month so far.
  const [customFrom, setCustomFrom] = useState(monthStart)
  const [customTo, setCustomTo] = useState(today)
  // The inputs; the report reloads only on Apply Filter.
  const [draftFrom, setDraftFrom] = useState(customFrom)
  const [draftTo, setDraftTo] = useState(customTo)
  const datesPending = draftFrom !== customFrom || draftTo !== customTo
  const isDefaultRange = customFrom === monthStart() && customTo === today() && !datesPending

  function resetDates() {
    setDraftFrom(monthStart())
    setDraftTo(today())
    setCustomFrom(monthStart())
    setCustomTo(today())
  }
  const [exportType, setExportType] = useState("sales")
  const [exportFormat, setExportFormat] = useState("csv")
  // The header's location: every location together (store admin) or one location.
  const scope = useDashboardLocation()
  const exportMutation = useExportReport()
  const canExport = user?.role === "store_admin" || user?.role === "manager"

  const range = useMemo(
    () => rangeForPreset("custom", { from: customFrom, to: customTo }),
    [customFrom, customTo]
  )

  const filters = useMemo(
    () => ({
      from: range.from || undefined,
      to: range.to || undefined,
      // Trend by month once the range is longer than about two months.
      period: customFrom && customTo && new Date(customTo) - new Date(customFrom) > 62 * 86400000 ? "monthly" : "daily",
      channel: channelTab === "overall" ? undefined : channelTab,
      ...(scope.locationId ? { location_id: scope.locationId } : {}),
    }),
    [range, customFrom, customTo, channelTab, scope.locationId]
  )

  const reportQuery = useScopedReportQuery(filters, { allLocations: scope.isAll })
  const tabs = REPORT_TABS.filter((row) => !row.allOnly || scope.isAll)
  const report = tabs.find((row) => row.id === searchParams.get("report")) || null
  const tab = report?.id || null
  function openReport(id) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set("report", id)
    else next.delete("report")
    setSearchParams(next)
  }
  const data = reportQuery.data
  const sales = data?.sales_summary
  const tax = data?.tax_breakdown

  const salesMix = useMemo(() => {
    const t = sales?.totals || {}
    return [
      { id: "net", label: "Net sales", value: Number(t.net_sales || 0) },
      { id: "tax", label: "Taxes", value: Number(t.taxes?.total || 0) },
      { id: "refunds", label: "Refunds", value: Number(t.refunds || 0) },
      { id: "discounts", label: "Discounts", value: Number(t.discounts || 0) },
      { id: "cost", label: "Cost", value: Number(t.cost || 0) },
      { id: "profit", label: "Gross profit", value: Math.max(0, Number(t.gross_profit || 0)) },
    ]
  }, [sales])

  const taxMix = useMemo(() => {
    const t = tax?.totals?.taxes || {}
    const p = t.payment_method_tax || {}
    return [
      { id: "sales", label: "Sales tax", value: Number(t.sales_tax || 0) },
      { id: "product", label: "Product level tax", value: Number(t.product_tax || 0) },
      { id: "category", label: "Category level tax", value: Number(t.category_tax || 0) },
      { id: "cash", label: "Payment tax · Cash", value: Number(p.cash || 0) },
      { id: "card", label: "Payment tax · Card", value: Number(p.card || 0) },
      { id: "jazzcash", label: "Payment tax · JazzCash", value: Number(p.jazzcash || 0) },
      { id: "easypaisa", label: "Payment tax · EasyPaisa", value: Number(p.easypaisa || 0) },
    ]
  }, [tax])

  const productBars = useMemo(
    () =>
      (data?.by_product?.rows || []).map((row) => ({
        id: row.id,
        label: row.product,
        value: Number(row.total_sales || 0),
      })),
    [data]
  )

  const categoryBars = useMemo(
    () =>
      (data?.by_category?.rows || []).map((row) => ({
        id: row.id || row.category,
        label: row.category,
        value: Number(row.total_sales || 0),
      })),
    [data]
  )

  const paymentBars = useMemo(
    () =>
      (data?.payments?.rows || []).map((row) => ({
        id: row.method,
        label: row.method,
        value: Number(row.net_amount || 0),
      })),
    [data]
  )

  async function onExport() {
    try {
      await exportMutation.mutateAsync({
        ...filters,
        type: exportType,
        format: exportFormat,
      })
      toast("Report downloaded")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {report ? (
            <button
              type="button"
              onClick={() => openReport(null)}
              className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-brand-700 hover:text-brand-700"
            >
              <ArrowLeft className="h-4 w-4" /> All reports
            </button>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{report ? report.label : "Reporting"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {store?.name ? `${store.name} · ` : ""}
            {scope.label} · {report ? report.about : "Pick a report. Figures are after refunds; voided and cancelled sales are left out."}
          </p>
        </div>
        <ChannelBar value={channelTab} onChange={setChannelTab} />
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Start date"
            type="date"
            value={draftFrom}
            max={draftTo || undefined}
            onChange={(e) => setDraftFrom(e.target.value)}
          />
          <Input
            label="End date"
            type="date"
            value={draftTo}
            min={draftFrom || undefined}
            onChange={(e) => setDraftTo(e.target.value)}
          />
          <Button
            className="h-11"
            disabled={!datesPending}
            onClick={() => {
              setCustomFrom(draftFrom)
              setCustomTo(draftTo)
            }}
          >
            Apply Filter
          </Button>
          <Button variant="ghost" className="h-11" disabled={isDefaultRange} onClick={resetDates}>
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </Button>
          {canExport ? (
            <div className="grid w-full grid-cols-2 items-end gap-2 sm:ml-auto sm:flex sm:w-auto">
              <Select
                label="Export type"
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
              >
                <option value="sales">Sales</option>
                <option value="payments">Payments</option>
                <option value="profit">Profit</option>
              </Select>
              <Select
                label="Format"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
                <option value="pdf">PDF</option>
              </Select>
              <Button variant="ghost" className="col-span-2 h-11" onClick={onExport} disabled={exportMutation.isPending}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {!report ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tabs.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => openReport(row.id)}
              className="group flex flex-col rounded-[24px] border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-700 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-900 transition group-hover:bg-brand-700 group-hover:text-white">
                <row.icon className="h-5 w-5" />
              </span>
              <span className="mt-4 text-base font-semibold text-slate-950">{row.label}</span>
              <span className="mt-1 flex-1 text-sm text-slate-500">{row.about}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-950">
                View report <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {report && reportQuery.isPending ? <PageLoader label="Loading report…" /> : null}
      {reportQuery.error ? (
        <p className="text-sm text-rose-700">{reportQuery.error.message}</p>
      ) : null}

      {data && tab === "sales" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Orders" value={sales?.totals?.orders ?? 0} hint={`${formatNumber(sales?.totals?.units_sold)} units sold`} />
            <StatCard label="Gross sales" value={formatCurrency(sales?.totals?.gross_sales)} hint="List price × quantity" />
            <StatCard label="Discounts" value={formatCurrency(sales?.totals?.discounts)} hint={`Product / offer ${formatCurrency(sales?.totals?.line_discounts)} · order ${formatCurrency(sales?.totals?.order_discounts)}`} />
            <StatCard label="Net sales" value={formatCurrency(sales?.totals?.net_sales)} hint="Gross − discounts, before tax" />
            <StatCard label="Sales tax" value={formatCurrency(sales?.totals?.taxes?.sales_tax)} />
            <StatCard label="Product level tax" value={formatCurrency(sales?.totals?.taxes?.product_tax)} />
            <StatCard label="Category level tax" value={formatCurrency(sales?.totals?.taxes?.category_tax)} />
            <StatCard label="Payment method tax" value={formatCurrency(sales?.totals?.taxes?.payment_method_tax?.total)} />
            <StatCard label="Total tax" value={formatCurrency(sales?.totals?.taxes?.total)} />
            <StatCard label="Total sales" value={formatCurrency(sales?.totals?.total_sales)} hint="Net sales + taxes (kept after refunds)" />
            <StatCard label="Collected at the till" value={formatCurrency(sales?.totals?.total_collected)} hint="Before refunds" />
            <StatCard label="Refunds" value={formatCurrency(sales?.totals?.refunds)} hint={`${sales?.totals?.refunded_orders ?? 0} orders fully refunded`} />
            <StatCard label="Cost" value={formatCurrency(sales?.totals?.cost)} />
            <StatCard label="Gross profit" value={formatCurrency(sales?.totals?.gross_profit)} hint="Net sales − cost" />
            <StatCard label="Avg order" value={formatCurrency(sales?.totals?.avg_order_value)} />
            <StatCard label="Voided / cancelled" value={`${sales?.totals?.voided_orders ?? 0} / ${sales?.totals?.cancelled_orders ?? 0}`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Sales breakdown">
              <DonutChart items={salesMix} empty="No sales figures for this range" />
            </ChartCard>
            <ChartCard title="Sales composition">
              <HBarChart items={salesMix} empty="No sales figures for this range" />
            </ChartCard>
          </div>
          <ChartCard title="Sales trend">
            <ColumnChart
              items={sales?.trend || []}
              valueKey="sales"
              labelKey="bucket"
              empty="No trend points for this range"
            />
          </ChartCard>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Trend table</h2>
            <DataTable
              columns={[
                { key: "bucket", label: "Period" },
                { key: "orders", label: "Orders" },
                { key: "sales", label: "Sales", render: (row) => formatCurrency(row.sales) },
              ]}
              rows={sales?.trend || []}
            />
          </div>
        </div>
      ) : null}

      {data && tab === "products" ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Top products by sales">
              <HBarChart items={productBars} empty="No product sales in this range" />
            </ChartCard>
            <ChartCard title="Product share">
              <DonutChart items={productBars.slice(0, 8)} empty="No product sales in this range" />
            </ChartCard>
          </div>
          <h2 className="text-sm font-semibold text-slate-900">Sales by product</h2>
          <DataTable
            columns={[
              { key: "product", label: "Product" },
              { key: "category", label: "Category" },
              { key: "units_sold", label: "Units", render: (row) => formatNumber(row.units_sold) },
              { key: "gross_sales", label: "Gross", render: (row) => formatCurrency(row.gross_sales) },
              { key: "discounts", label: "Discounts", render: (row) => formatCurrency(row.discounts) },
              { key: "net_sales", label: "Net", render: (row) => formatCurrency(row.net_sales) },
              { key: "sales_tax", label: "Sales tax", render: (row) => formatCurrency(row.sales_tax) },
              { key: "product_tax", label: "Product tax", render: (row) => formatCurrency(row.product_tax) },
              { key: "category_tax", label: "Category tax", render: (row) => formatCurrency(row.category_tax) },
              { key: "total_sales", label: "Total", render: (row) => formatCurrency(row.total_sales) },
              { key: "percent", label: "Share", render: (row) => `${row.percent ?? 0}%` },
            ]}
            rows={data.by_product?.rows || []}
          />
        </div>
      ) : null}

      {data && tab === "categories" ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Category sales">
              <HBarChart items={categoryBars} empty="No category sales in this range" />
            </ChartCard>
            <ChartCard title="Category share">
              <DonutChart items={categoryBars} empty="No category sales in this range" />
            </ChartCard>
          </div>
          <h2 className="text-sm font-semibold text-slate-900">Sales by category</h2>
          <DataTable
            columns={[
              { key: "category", label: "Category" },
              { key: "units_sold", label: "Units", render: (row) => formatNumber(row.units_sold) },
              { key: "gross_sales", label: "Gross", render: (row) => formatCurrency(row.gross_sales) },
              { key: "discounts", label: "Discounts", render: (row) => formatCurrency(row.discounts) },
              { key: "net_sales", label: "Net", render: (row) => formatCurrency(row.net_sales) },
              { key: "sales_tax", label: "Sales tax", render: (row) => formatCurrency(row.sales_tax) },
              { key: "product_tax", label: "Product tax", render: (row) => formatCurrency(row.product_tax) },
              { key: "category_tax", label: "Category tax", render: (row) => formatCurrency(row.category_tax) },
              { key: "total_sales", label: "Total", render: (row) => formatCurrency(row.total_sales) },
              { key: "percent", label: "Share", render: (row) => `${row.percent ?? 0}%` },
            ]}
            rows={data.by_category?.rows || []}
          />
        </div>
      ) : null}

      {data && tab === "payments" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Transactions"
              value={data.payments?.totals?.transactions ?? 0}
            />
            <StatCard label="Gross" value={formatCurrency(data.payments?.totals?.gross_amount)} />
            <StatCard label="Refunds" value={formatCurrency(data.payments?.totals?.refunds)} />
            <StatCard label="Net" value={formatCurrency(data.payments?.totals?.net_amount)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Payment mix">
              <DonutChart items={paymentBars} empty="No payment data" />
            </ChartCard>
            <ChartCard title="Net by method">
              <BarList items={data.payments?.rows || []} />
            </ChartCard>
          </div>
          <DataTable
            columns={[
              {
                key: "method",
                label: "Method",
                render: (row) => <StatusBadge value={row.method} />,
              },
              { key: "transactions", label: "Count" },
              {
                key: "gross_amount",
                label: "Gross",
                render: (row) => formatCurrency(row.gross_amount),
              },
              { key: "tax", label: "Payment tax", render: (row) => formatCurrency(row.tax) },
              { key: "refunds", label: "Refunds", render: (row) => formatCurrency(row.refunds) },
              {
                key: "net_amount",
                label: "Net",
                render: (row) => formatCurrency(row.net_amount),
              },
              {
                key: "percent",
                label: "Share",
                render: (row) => `${row.percent ?? 0}%`,
              },
            ]}
            rows={data.payments?.rows || []}
          />
        </div>
      ) : null}

      {data && tab === "inventory" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Current stock levels with in/out movement for the selected date range
            {channelTab !== "overall" ? ` (${channelTab.toUpperCase()} movements)` : ""}.
          </p>
          <DataTable
            columns={[
              { key: "product", label: "Product" },
              { key: "sku", label: "SKU" },
              { key: "category", label: "Category" },
              { key: "location", label: "Location" },
              { key: "stock_in", label: "In", render: (row) => formatNumber(row.stock_in) },
              { key: "stock_out", label: "Out", render: (row) => formatNumber(row.stock_out) },
              {
                key: "current_stock",
                label: "On hand",
                render: (row) => formatNumber(row.current_stock),
              },
            ]}
            rows={data.inventory?.rows || []}
          />
        </div>
      ) : null}

      {data && tab === "movements" ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Stock movements</h2>
          <DataTable
            columns={[
              {
                key: "date",
                label: "Date",
                render: (row) => formatDate(row.date),
              },
              { key: "product", label: "Product" },
              { key: "location", label: "Location" },
              { key: "type", label: "Type" },
              { key: "qty", label: "Qty", render: (row) => formatNumber(row.qty) },
              { key: "reason", label: "Reason" },
              {
                key: "channel",
                label: "Channel",
                render: (row) => row.channel || "—",
              },
              { key: "cashier", label: "Staff" },
            ]}
            rows={data.stock_movement?.rows || []}
          />
        </div>
      ) : null}

      {data && tab === "transfers" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Transfers" value={formatNumber(data.stock_transfers?.summary?.transfers || 0)} hint={`${data.stock_transfers?.summary?.lines || 0} product lines`} />
            <StatCard label="Units sent" value={formatNumber(data.stock_transfers?.summary?.units_sent || 0)} />
            <StatCard label="Units received" value={formatNumber(data.stock_transfers?.summary?.units_received || 0)} />
            <StatCard label="On the way" value={formatNumber(data.stock_transfers?.summary?.units_on_the_way || 0)} hint={`${formatNumber(data.stock_transfers?.summary?.units_cancelled || 0)} cancelled`} />
          </div>
          <DataTable
            columns={[
              { key: "transfer", label: "Transfer #", render: (row) => `#${row.transfer}` },
              { key: "date", label: "Date", render: (row) => formatDate(row.date) },
              { key: "from", label: "From" },
              { key: "to", label: "To" },
              { key: "product", label: "Product" },
              { key: "qty", label: "Sent", render: (row) => formatNumber(row.qty) },
              { key: "received_qty", label: "Received", render: (row) => (row.received_qty == null ? "—" : formatNumber(row.received_qty)) },
              { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
              { key: "staff", label: "Sent by" },
            ]}
            rows={data.stock_transfers?.rows || []}
            empty="No transfers in this range"
          />
        </div>
      ) : null}

      {data && tab === "discounts" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Every discount given on the sales in this range, as it was at the sale — still shown when the discount was changed or removed since. Refunded units leave it.</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Discounts given" value={formatCurrency(data.discounts?.total || 0)} />
            <StatCard label="Orders with a discount" value={formatNumber(data.discounts?.orders || 0)} />
            {(data.discounts?.by_source || []).slice(0, 2).map((row) => (
              <StatCard key={row.source} label={row.label} value={formatCurrency(row.amount)} hint={`${row.lines} lines · ${row.orders} orders`} />
            ))}
          </div>
          <DataTable
            columns={[
              { key: "label", label: "Source" },
              { key: "orders", label: "Orders" },
              { key: "lines", label: "Lines" },
              { key: "amount", label: "Discount", render: (row) => formatCurrency(row.amount) },
            ]}
            rows={data.discounts?.by_source || []}
            empty="No discounts in this range"
          />
          <DataTable
            columns={[
              { key: "date", label: "Date", render: (row) => formatDate(row.date) },
              { key: "order", label: "Order #", render: (row) => `#${row.order}` },
              { key: "location", label: "Location" },
              { key: "product", label: "Product" },
              { key: "qty", label: "Qty", render: (row) => (row.qty == null ? "—" : formatNumber(row.qty)) },
              { key: "source_label", label: "Source" },
              { key: "name", label: "Discount", render: (row) => row.name || "—" },
              { key: "gross", label: "Before discount", render: (row) => formatCurrency(row.gross) },
              { key: "amount", label: "Discount given", render: (row) => formatCurrency(row.amount) },
              { key: "cashier", label: "Staff" },
            ]}
            rows={data.discounts?.rows || []}
            empty="No discounts in this range"
          />
        </div>
      ) : null}

      {data && tab === "refunds" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Refunds" value={data.refunded_orders?.totals?.refunds ?? 0} hint={`${data.refunded_orders?.totals?.complete ?? 0} complete · ${data.refunded_orders?.totals?.partial ?? 0} partial`} />
            <StatCard label="Orders refunded" value={data.refunded_orders?.totals?.orders ?? 0} />
            <StatCard label="Amount" value={formatCurrency(data.refunded_orders?.totals?.amount)} hint="Before tax" />
            <StatCard label="Total refunded" value={formatCurrency(data.refunded_orders?.totals?.total)} hint={`incl. tax ${formatCurrency(data.refunded_orders?.totals?.tax)}`} />
          </div>
          <DataTable
            columns={[
              { key: "id", label: "Refund #", render: (row) => `#${row.id}` },
              { key: "date", label: "Date", render: (row) => formatDate(row.date) },
              { key: "order_number", label: "Order #", render: (row) => `#${row.order_number}` },
              { key: "refund_type", label: "Type", render: (row) => <StatusBadge value={row.refund_type} /> },
              { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
              { key: "tax", label: "Tax", render: (row) => formatCurrency(row.tax) },
              { key: "total", label: "Total", render: (row) => formatCurrency(row.total) },
              { key: "reason", label: "Reason" },
              { key: "cashier", label: "Staff" },
            ]}
            rows={data.refunded_orders?.rows || []}
            empty="No refunds in this range"
          />
        </div>
      ) : null}

      {data && tab === "cancelled" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Orders" value={data.cancelled_orders?.totals?.orders ?? 0} />
            <StatCard label="Voided" value={data.cancelled_orders?.totals?.voided ?? 0} />
            <StatCard label="Cancelled" value={data.cancelled_orders?.totals?.cancelled ?? 0} />
            <StatCard label="Lost sales" value={formatCurrency(data.cancelled_orders?.totals?.amount)} />
          </div>
          <DataTable
            columns={[
              { key: "id", label: "Order #", render: (row) => `#${row.id}` },
              { key: "date", label: "Date", render: (row) => formatDate(row.date) },
              { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
              { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
              { key: "reason", label: "Reason" },
              { key: "cashier", label: "Staff" },
            ]}
            rows={data.cancelled_orders?.rows || []}
            empty="No voided or cancelled orders in this range"
          />
        </div>
      ) : null}

      {data && tab === "batches" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Each batch worked out from its own sales: takings per method, the cash expected in the drawer, what was counted and the difference.</p>
          <DataTable
            columns={[
              { key: "session_id", label: "Batch #", render: (row) => `#${row.session_id}` },
              { key: "cashier", label: "Staff" },
              { key: "date_time", label: "Opened", render: (row) => formatDate(row.date_time) },
              { key: "closed_at", label: "Closed", render: (row) => formatDate(row.closed_at) },
              { key: "orders", label: "Orders" },
              { key: "opening_amount", label: "Opening", render: (row) => formatCurrency(row.opening_amount) },
              { key: "net_sales", label: "Net", render: (row) => formatCurrency(row.net_sales) },
              { key: "tax", label: "Tax", render: (row) => formatCurrency(row.tax) },
              { key: "refunds", label: "Refunds", render: (row) => formatCurrency(row.refunds) },
              { key: "total_sales", label: "Total sales", render: (row) => formatCurrency(row.total_sales) },
              { key: "cash_sales", label: "Cash", render: (row) => formatCurrency(row.cash_sales) },
              { key: "card_sales", label: "Card", render: (row) => formatCurrency(row.card_sales) },
              { key: "jazzcash_sales", label: "JazzCash", render: (row) => formatCurrency(row.jazzcash_sales) },
              { key: "easypaisa_sales", label: "EasyPaisa", render: (row) => formatCurrency(row.easypaisa_sales) },
              { key: "expected_cash", label: "Expected cash", render: (row) => formatCurrency(row.expected_cash) },
              { key: "counted_cash", label: "Counted", render: (row) => (row.counted_cash == null ? "—" : formatCurrency(row.counted_cash)) },
              { key: "variance", label: "Variance", render: (row) => formatCurrency(row.variance) },
              { key: "status", label: "Status", render: (row) => <StatusBadge value={String(row.status).toLowerCase()} /> },
            ]}
            rows={data.z_reports?.rows || []}
            empty="No batches in this range"
          />
        </div>
      ) : null}

      {tab === "sessions" ? <SessionsReport from={customFrom} to={customTo} locationId={scope.locationId} /> : null}

      {data && tab === "cashiers" ? (
        <DataTable
          columns={[
            { key: "cashier", label: "Staff" },
            { key: "orders", label: "Orders" },
            { key: "total_sales", label: "Charged", render: (row) => formatCurrency(row.total_sales) },
            { key: "discounts", label: "Discounts", render: (row) => formatCurrency(row.discounts) },
            { key: "tax", label: "Tax", render: (row) => formatCurrency(row.tax) },
            { key: "refunds", label: "Refunds", render: (row) => formatCurrency(row.refunds) },
            { key: "net_sales", label: "Net (after refunds)", render: (row) => formatCurrency(row.net_sales) },
          ]}
          rows={data.by_cashier?.rows || []}
          empty="No sales in this range"
        />
      ) : null}

      {data && tab === "locations" ? (
        <DataTable
          columns={[
            { key: "location", label: "Location", render: (row) => row.location?.name || "—" },
            { key: "orders", label: "Orders" },
            { key: "gross_sales", label: "Gross", render: (row) => formatCurrency(row.gross_sales) },
            { key: "discounts", label: "Discounts", render: (row) => formatCurrency(row.discounts) },
            { key: "net_sales", label: "Net", render: (row) => formatCurrency(row.net_sales) },
            { key: "tax", label: "Tax", render: (row) => formatCurrency(row.tax) },
            { key: "refunds", label: "Refunds", render: (row) => formatCurrency(row.refunds) },
            { key: "total_sales", label: "Total sales", render: (row) => formatCurrency(row.total_sales) },
            { key: "percent", label: "Share", render: (row) => `${row.percent ?? 0}%` },
          ]}
          rows={data.by_location?.rows || []}
          empty="No sales in this range"
        />
      ) : null}

      {data && tab === "tax" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Orders" value={tax?.totals?.orders ?? 0} />
            <StatCard label="Net sales" value={formatCurrency(tax?.totals?.net_sales)} hint="Before tax" />
            <StatCard label="Total tax" value={formatCurrency(tax?.totals?.tax_collected)} />
            <StatCard label="Total sales" value={formatCurrency(tax?.totals?.total_sales)} hint="Net sales + taxes" />
            <StatCard label="Sales tax" value={formatCurrency(tax?.totals?.taxes?.sales_tax)} />
            <StatCard label="Product level tax" value={formatCurrency(tax?.totals?.taxes?.product_tax)} />
            <StatCard label="Category level tax" value={formatCurrency(tax?.totals?.taxes?.category_tax)} />
            <StatCard label="Payment method tax" value={formatCurrency(tax?.totals?.taxes?.payment_method_tax?.total)} hint={`Cash ${formatCurrency(tax?.totals?.taxes?.payment_method_tax?.cash)} · Card ${formatCurrency(tax?.totals?.taxes?.payment_method_tax?.card)} · JazzCash ${formatCurrency(tax?.totals?.taxes?.payment_method_tax?.jazzcash)} · EasyPaisa ${formatCurrency(tax?.totals?.taxes?.payment_method_tax?.easypaisa)}`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Tax collection mix">
              <DonutChart items={taxMix} empty="No tax collected in this range" />
            </ChartCard>
            <ChartCard title="Tax by rule">
              <HBarChart items={taxMix} empty="No tax collected in this range" />
            </ChartCard>
          </div>
          <DataTable
            columns={[
              { key: "tax_rule", label: "Tax rule" },
              {
                key: "tax_collected",
                label: "Collected",
                render: (row) => formatCurrency(row.tax_collected),
              },
            ]}
            rows={tax?.rows || []}
            empty="No tax collected in this range"
          />
        </div>
      ) : null}
    </section>
  )
}
