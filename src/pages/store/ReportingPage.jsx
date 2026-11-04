import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
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
  Search,
  X,
} from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { getReportingOverview, getReportingSection } from "../../api/reports.js"
import { toDateInput } from "../../features/reports/dateRange.js"
import { ChartCard, ColumnChart, HBarChart } from "../../features/reports/ReportCharts.jsx"
import { columnsOf, flattenSummary, formatValue, summaryLabel, toneOf } from "../../features/reporting/reportFormat.js"
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
const CHART_LIMIT = { sales: "all", payments: "all", peak_hours: "all", top_products: 10, top_categories: 10, profit: 10, locations: "all" }

const weekAgo = () => {
  const date = new Date()
  date.setDate(date.getDate() - 6)
  return toDateInput(date)
}
const today = () => toDateInput(new Date())

/** One table of a card, paged by the API. */
function ReportTable({ section, name, base, search, title }) {
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

  return (
    <div className={ui.card}>
      {/* A card with several lists names each one; the filters are in the page header. */}
      {title ? (
        <div className="flex items-center gap-2.5 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <span className={ui.count}>{total}</span>
        </div>
      ) : null}
      <div className={ui.scroll}>
        {rows.length ? (
          <table className={`${ui.table} min-w-max`}>
            <thead className={ui.thead}>
              <tr>
                {columns.map((key) => (
                  <th key={key} className={ui.th}>{humanize(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className={ui.tr}>
                  {columns.map((key) => (
                    <td key={key} className={`${ui.td} whitespace-nowrap ${toneOf(key, row[key])}`}>
                      {formatValue(key, row[key], row)}
                    </td>
                  ))}
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

/** Orders by hour × weekday, darker = busier. */
function PeakHeatmap({ rows }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const max = Math.max(1, ...rows.flatMap((row) => days.map((day) => Number(row[day] || 0))))
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="px-1 py-1" />
            {days.map((day) => <th key={day} className="px-1 py-1 font-semibold text-slate-500">{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hour}>
              <td className="pr-2 text-right tabular-nums text-slate-500">{row.hour}</td>
              {days.map((day) => {
                const value = Number(row[day] || 0)
                return (
                  <td key={day} className="p-0.5">
                    <div
                      title={`${day} ${row.hour}: ${value} orders`}
                      className="flex h-6 w-10 items-center justify-center rounded text-[10px] font-semibold"
                      style={{ background: value ? `rgba(19, 92, 76, ${0.12 + (value / max) * 0.88})` : "#f1f5f9", color: value / max > 0.5 ? "#fff" : "#0f172a" }}
                    >
                      {value || ""}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionCharts({ section, data }) {
  const tables = data?.tables || {}
  const rowsOf = (name) => tables[name]?.rows || []
  if (section === "sales") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sales trend"><ColumnChart items={rowsOf("trend")} valueKey="sales" labelKey="bucket" empty="No sales in these dates" /></ChartCard>
        <ChartCard title="By payment method"><HBarChart items={rowsOf("payments").map((row) => ({ label: row.label || row.method, value: Number(row.net_amount || 0) }))} empty="No payments in these dates" /></ChartCard>
      </div>
    )
  }
  if (section === "payments") {
    return <ChartCard title="Net by method"><HBarChart items={rowsOf("rows").map((row) => ({ label: row.label || row.method, value: Number(row.net_amount || 0) }))} empty="No payments in these dates" /></ChartCard>
  }
  if (section === "top_products" || section === "top_categories") {
    const key = section === "top_products" ? "product" : "category"
    return <ChartCard title="Top 10 by sales"><HBarChart items={rowsOf("rows").map((row) => ({ label: row[key], value: Number(row.total_sales || 0) }))} empty="No sales in these dates" /></ChartCard>
  }
  if (section === "locations") {
    return <ChartCard title="Sales by location"><HBarChart items={rowsOf("rows").map((row) => ({ label: row.location?.name || "—", value: Number(row.total_sales || 0) }))} empty="No sales in these dates" /></ChartCard>
  }
  if (section === "profit") {
    return <ChartCard title="Top 10 products by gross profit"><HBarChart items={rowsOf("by_product").map((row) => ({ label: row.product, value: Number(row.gross_profit || 0) }))} empty="No sales in these dates" /></ChartCard>
  }
  if (section === "peak_hours") {
    return <ChartCard title="Orders by hour and weekday"><PeakHeatmap rows={rowsOf("by_hour")} /></ChartCard>
  }
  return null
}

function SummaryCards({ summary }) {
  const items = flattenSummary(summary).filter(([, value]) => value !== null && typeof value !== "object")
  if (!items.length) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([key, value]) => (
        <div key={key} className="rounded-[20px] border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">{summaryLabel(key)}</p>
          <p className={`mt-1 text-lg font-semibold text-slate-950 ${toneOf(key, value)}`}>{formatValue(key, value)}</p>
        </div>
      ))}
    </div>
  )
}

/** The open card: its figures, charts and paged tables. */
function SectionView({ card, base, search }) {
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
        <ReportTable key={`${name}|${JSON.stringify(base)}|${search}`} section={card.id} name={name} base={base} search={search} title={names.length === 1 ? null : humanize(name)} />
      ))}
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
              className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-brand-700 hover:text-brand-700"
            >
              <ArrowLeft className="h-4 w-4" /> All reports
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
