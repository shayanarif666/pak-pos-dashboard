import { useMemo, useState } from "react"
import { Download } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  periodForPreset,
  rangeForPreset,
  REPORT_PRESETS,
} from "../../features/reports/dateRange.js"
import {
  ChartCard,
  ColumnChart,
  DonutChart,
  HBarChart,
} from "../../features/reports/ReportCharts.jsx"
import {
  useBreakdownReportQuery,
  useExportReport,
} from "../../features/reports/reportQuery.js"
import { formatCurrency, formatNumber } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

const REPORT_TABS = [
  { id: "sales", label: "Sales Summary" },
  { id: "products", label: "By Products" },
  { id: "categories", label: "By Categories" },
  { id: "payments", label: "Payments" },
  { id: "inventory", label: "Inventory" },
  { id: "movements", label: "Stock Movements" },
  { id: "refunds", label: "Refunds / Cancelled" },
  { id: "tax", label: "Tax Report" },
]

const CHANNEL_TABS = [
  { id: "overall", label: "Overall" },
  { id: "web", label: "By Web" },
  { id: "pos", label: "By POS" },
]

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
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

function TabBar({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onChange(row.id)}
          className={[
            "rounded-2xl px-4 py-2 text-sm font-medium transition",
            value === row.id
              ? "bg-brand-50 text-slate-900"
              : "text-slate-500 hover:bg-brand-50 hover:text-slate-800",
          ].join(" ")}
        >
          {row.label}
        </button>
      ))}
    </div>
  )
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

export function ReportsPage() {
  const { user, store } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState("sales")
  const [channelTab, setChannelTab] = useState("overall")
  const [preset, setPreset] = useState("month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [exportType, setExportType] = useState("sales")
  const [exportFormat, setExportFormat] = useState("csv")
  const exportMutation = useExportReport()
  const canExport = user?.role === "store_admin" || user?.role === "manager"

  const range = useMemo(
    () => rangeForPreset(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo]
  )

  const filters = useMemo(
    () => ({
      from: range.from || undefined,
      to: range.to || undefined,
      period: periodForPreset(preset),
      channel: channelTab === "overall" ? undefined : channelTab,
    }),
    [range, preset, channelTab]
  )

  const reportQuery = useBreakdownReportQuery(filters)
  const data = reportQuery.data
  const sales = data?.sales_summary
  const tax = data?.tax_breakdown

  const salesMix = useMemo(() => {
    const t = sales?.totals || {}
    return [
      { id: "revenue", label: "Revenue", value: Number(t.revenue || 0) },
      { id: "tax", label: "Tax collected", value: Number(t.tax || 0) },
      { id: "refunds", label: "Refunds", value: Number(t.refunds || 0) },
      { id: "discounts", label: "Discounts", value: Number(t.discounts || 0) },
      { id: "cost", label: "Cost", value: Number(t.cost || 0) },
      { id: "profit", label: "Profit", value: Math.max(0, Number(t.gross_profit || 0)) },
    ]
  }, [sales])

  const taxMix = useMemo(() => {
    const c = tax?.totals?.tax_collection || {}
    return [
      { id: "product", label: "Product tax", value: Number(c.product_tax || 0) },
      { id: "category", label: "Category tax", value: Number(c.category_tax || 0) },
      { id: "default", label: "Store default", value: Number(c.default_store_tax || 0) },
      { id: "cash", label: "Cash GST", value: Number(c.payment_gst_cash || 0) },
      { id: "card", label: "Card GST", value: Number(c.payment_gst_card || 0) },
      { id: "jazzcash", label: "JazzCash GST", value: Number(c.payment_gst_jazzcash || 0) },
      { id: "easypaisa", label: "Easypaisa GST", value: Number(c.payment_gst_easypaisa || 0) },
      { id: "fbr", label: "FBR", value: Number(c.fbr || 0) },
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Commerce</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            {store?.name ? `${store.name} · ` : ""}
            Channel-aware sales, inventory, tax, and refund analytics.
          </p>
        </div>
        <ChannelBar value={channelTab} onChange={setChannelTab} />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {REPORT_PRESETS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setPreset(row.id)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                preset === row.id
                  ? "bg-brand-700 text-white"
                  : "border border-slate-200 bg-slate-100 text-slate-600 hover:text-brand-700",
              ].join(" ")}
            >
              {row.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {preset === "custom" ? (
            <>
              <Input
                label="From"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <Input
                label="To"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </>
          ) : null}
          {canExport ? (
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
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
              <Button variant="ghost" onClick={onExport} disabled={exportMutation.isPending}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <TabBar tabs={REPORT_TABS} value={tab} onChange={setTab} />

      {reportQuery.isPending ? <PageLoader label="Loading report…" /> : null}
      {reportQuery.error ? (
        <p className="text-sm text-rose-700">{reportQuery.error.message}</p>
      ) : null}

      {data && tab === "sales" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Orders" value={sales?.totals?.orders ?? 0} />
            <StatCard label="Total collected" value={formatCurrency(sales?.totals?.total_collected)} />
            <StatCard label="Refunds" value={formatCurrency(sales?.totals?.refunds)} />
            <StatCard
              label="Revenue"
              value={formatCurrency(sales?.totals?.revenue)}
              hint="Pre-tax subtotal after refunds"
            />
            <StatCard label="Tax collected" value={formatCurrency(sales?.totals?.tax)} />
            <StatCard
              label="Net sale"
              value={formatCurrency(sales?.totals?.net_sales)}
              hint="Revenue + tax kept"
            />
            <StatCard label="Cost" value={formatCurrency(sales?.totals?.cost)} />
            <StatCard label="Profit" value={formatCurrency(sales?.totals?.gross_profit)} />
            <StatCard label="Gross sales" value={formatCurrency(sales?.totals?.gross_sales)} />
            <StatCard label="Discounts" value={formatCurrency(sales?.totals?.discounts)} />
            <StatCard label="Avg order" value={formatCurrency(sales?.totals?.avg_order_value)} />
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
              { key: "total_sales", label: "Sales", render: (row) => formatCurrency(row.total_sales) },
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
              { key: "total_sales", label: "Sales", render: (row) => formatCurrency(row.total_sales) },
              {
                key: "percent",
                label: "Share",
                render: (row) => `${row.percent ?? 0}%`,
              },
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

      {data && tab === "refunds" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Refunds" value={data.refund_void?.totals?.refunds ?? 0} />
            <StatCard label="Voids" value={data.refund_void?.totals?.voids ?? 0} />
            <StatCard label="Cancelled" value={data.refund_void?.totals?.cancelled ?? 0} />
            <StatCard label="Amount" value={formatCurrency(data.refund_void?.totals?.amount)} />
          </div>
          <DataTable
            columns={[
              { key: "type", label: "Type", render: (row) => String(row.type).toUpperCase() },
              {
                key: "date",
                label: "Date",
                render: (row) => formatDate(row.date),
              },
              { key: "order_number", label: "Order #" },
              {
                key: "channel",
                label: "Channel",
                render: (row) => row.channel || "—",
              },
              { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
              { key: "reason", label: "Reason" },
              { key: "cashier", label: "Staff" },
            ]}
            rows={data.refund_void?.rows || []}
            empty="No refunds, voids, or cancelled orders in this range"
          />
        </div>
      ) : null}

      {data && tab === "tax" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Orders" value={tax?.totals?.orders ?? 0} />
            <StatCard label="Net sales" value={formatCurrency(tax?.totals?.total_sales)} />
            <StatCard label="Total tax collected" value={formatCurrency(tax?.totals?.tax_collected)} />
            <StatCard
              label="Product tax"
              value={formatCurrency(tax?.totals?.tax_collection?.product_tax)}
            />
            <StatCard
              label="Category tax"
              value={formatCurrency(tax?.totals?.tax_collection?.category_tax)}
            />
            <StatCard
              label="Store default tax"
              value={formatCurrency(tax?.totals?.tax_collection?.default_store_tax)}
            />
            <StatCard
              label="Cash GST"
              value={formatCurrency(tax?.totals?.tax_collection?.payment_gst_cash)}
            />
            <StatCard
              label="Card GST"
              value={formatCurrency(tax?.totals?.tax_collection?.payment_gst_card)}
            />
            <StatCard
              label="JazzCash GST"
              value={formatCurrency(tax?.totals?.tax_collection?.payment_gst_jazzcash)}
            />
            <StatCard
              label="Easypaisa GST"
              value={formatCurrency(tax?.totals?.tax_collection?.payment_gst_easypaisa)}
            />
            <StatCard
              label="Payment GST total"
              value={formatCurrency(tax?.totals?.tax_collection?.payment_gst)}
            />
            <StatCard label="FBR" value={formatCurrency(tax?.totals?.tax_collection?.fbr)} />
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
