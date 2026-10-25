import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { PageLoader } from "./Spinner.jsx"

const PAGE_SIZES = [10, 20, 50, 100]

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"

// Date presets: from N back to today. "custom" shows the from / to inputs.
const DATE_PRESETS = [
  ["all", "All time"],
  ["week", "Last week"],
  ["month", "Last month"],
  ["6months", "Last 6 months"],
  ["year", "Last year"],
  ["custom", "Custom range"],
]

function isoDay(date) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function presetRange(preset) {
  if (preset === "all" || preset === "custom") return null
  const start = new Date()
  if (preset === "week") start.setDate(start.getDate() - 7)
  if (preset === "month") start.setMonth(start.getMonth() - 1)
  if (preset === "6months") start.setMonth(start.getMonth() - 6)
  if (preset === "year") start.setFullYear(start.getFullYear() - 1)
  return { from: isoDay(start), to: isoDay(new Date()) }
}

function dayStart(value) {
  return value ? new Date(`${value}T00:00:00`) : null
}
function dayEnd(value) {
  return value ? new Date(`${value}T23:59:59.999`) : null
}

function compare(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  const da = a instanceof Date ? a.getTime() : null
  const db = b instanceof Date ? b.getTime() : null
  if (da != null && db != null) return da - db
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
}

/**
 * The dashboard's list table: search, dropdown filters, date range, sorting and pagination.
 *
 *   columns:  [{ key, header, render?(row), sortValue?(row), align?: "right" | "center", className? }]
 *   rows:     the list (client mode: every row; server mode: the current page)
 *   search:   { placeholder, text(row) }          — client mode matches text(row)
 *   filters:  [{ key, label, options: [{ value, label }], match?(row, value) }]
 *   dateRange:{ label?, value(row) }              — from / to inputs (client mode filters by value(row))
 *   server:   { total, onChange({ page, limit, search, filters, from, to }) } — the API pages / filters
 *
 * State (page, page size, search, filters, dates, sort) lives here; in server mode every change is
 * reported through server.onChange so the page can refetch.
 */
export function DataTable({
  columns,
  rows = [],
  loading = false,
  error = null,
  rowKey = (row) => row.id,
  search = null,
  filters = [],
  dateRange = null,
  initialSort = null,
  defaultPageSize = 20,
  emptyText = "Nothing to show yet.",
  toolbar = null,
  onRowClick = null,
  server = null,
}) {
  const [query, setQuery] = useState("")
  const [filterValues, setFilterValues] = useState({})
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [preset, setPreset] = useState("all")
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(defaultPageSize)

  // Back to page 1 whenever what is shown changes.
  useEffect(() => {
    setPage(1)
  }, [query, filterValues, from, to, limit])

  useEffect(() => {
    if (!server?.onChange) return
    server.onChange({ page, limit, search: query.trim(), filters: filterValues, from, to })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, query, filterValues, from, to])

  const visible = useMemo(() => {
    if (server) return rows
    let list = rows
    const needle = query.trim().toLowerCase()
    if (needle && search?.text) {
      list = list.filter((row) => String(search.text(row) ?? "").toLowerCase().includes(needle))
    }
    for (const filter of filters) {
      const value = filterValues[filter.key]
      if (value === undefined || value === "") continue
      list = list.filter((row) =>
        filter.match ? filter.match(row, value) : String(row[filter.key] ?? "") === String(value)
      )
    }
    if (dateRange?.value && (from || to)) {
      const start = dayStart(from)
      const end = dayEnd(to)
      list = list.filter((row) => {
        const raw = dateRange.value(row)
        if (!raw) return false
        const at = new Date(raw)
        return (!start || at >= start) && (!end || at <= end)
      })
    }
    if (sort) {
      const column = columns.find((col) => col.key === sort.key)
      const valueOf = column?.sortValue || ((row) => row[sort.key])
      list = [...list].sort((a, b) => compare(valueOf(a), valueOf(b)) * (sort.dir === "desc" ? -1 : 1))
    }
    return list
  }, [rows, server, query, search, filters, filterValues, dateRange, from, to, sort, columns])

  const total = server ? Number(server.total || 0) : visible.length
  const pages = Math.max(1, Math.ceil(total / limit))
  const current = Math.min(page, pages)
  const pageRows = server ? visible : visible.slice((current - 1) * limit, current * limit)
  const firstShown = total ? (current - 1) * limit + 1 : 0
  const lastShown = Math.min(current * limit, total)
  const hasFilters = Boolean(query || from || to || preset !== "all" || Object.values(filterValues).some((v) => v !== "" && v != null))

  function toggleSort(column) {
    if (server || column.sortable === false) return
    setSort((prev) =>
      prev?.key === column.key
        ? prev.dir === "asc"
          ? { key: column.key, dir: "desc" }
          : null
        : { key: column.key, dir: "asc" }
    )
  }

  function clearAll() {
    setQuery("")
    setFilterValues({})
    setFrom("")
    setTo("")
    setPreset("all")
  }

  function choosePreset(next) {
    setPreset(next)
    if (next === "custom") return
    const range = presetRange(next)
    setFrom(range?.from || "")
    setTo(range?.to || "")
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      {search || filters.length || dateRange || toolbar ? (
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
          {search ? (
            <label className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder={search.placeholder || "Search…"}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          ) : null}
          {filters.map((filter) => (
            <label key={filter.key} className="text-xs font-medium text-slate-500">
              <span className="mb-1 block">{filter.label}</span>
              <select
                className={`${inputClass} min-w-36`}
                value={filterValues[filter.key] ?? ""}
                onChange={(event) => setFilterValues((prev) => ({ ...prev, [filter.key]: event.target.value }))}
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {dateRange ? (
            <>
              <label className="text-xs font-medium text-slate-500">
                <span className="mb-1 block">{dateRange.label || "Date"}</span>
                <select className={`${inputClass} min-w-36`} value={preset} onChange={(event) => choosePreset(event.target.value)}>
                  {DATE_PRESETS.map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </select>
              </label>
              {preset === "custom" ? (
                <>
                  <label className="text-xs font-medium text-slate-500">
                    <span className="mb-1 block">From</span>
                    <input type="date" className={inputClass} value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
                  </label>
                  <label className="text-xs font-medium text-slate-500">
                    <span className="mb-1 block">To</span>
                    <input type="date" className={inputClass} value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
                  </label>
                </>
              ) : null}
            </>
          ) : null}
          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          ) : null}
          {toolbar ? <div className="ml-auto flex items-end gap-2">{toolbar}</div> : null}
        </div>
      ) : null}

      {error ? <p className="px-5 py-3 text-sm text-rose-700">{error.message || String(error)}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key
                const sortable = !server && column.sortable !== false
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={[
                      "whitespace-nowrap px-4 py-3 font-semibold",
                      column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "",
                      sortable ? "cursor-pointer select-none hover:text-slate-800" : "",
                    ].join(" ")}
                    onClick={() => toggleSort(column)}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.header}
                      {active ? (
                        sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : null}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6">
                  <PageLoader label="Loading…" />
                </td>
              </tr>
            ) : pageRows.length ? (
              pageRows.map((row, index) => (
                <tr
                  key={rowKey(row) ?? index}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    "border-t border-slate-100",
                    onRowClick ? "cursor-pointer hover:bg-brand-50/50" : "hover:bg-slate-50/60",
                  ].join(" ")}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        "px-4 py-3 align-middle text-slate-700",
                        column.align === "right" ? "text-right tabular-nums" : column.align === "center" ? "text-center" : "",
                        column.className || "",
                      ].join(" ")}
                    >
                      {column.render ? column.render(row) : (row[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {hasFilters ? "No rows match these filters." : emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>
            {firstShown}–{lastShown} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 enabled:hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center">
              Page {current} / {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 enabled:hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Options for a filter from the distinct values of a column. */
export function optionsFrom(rows, valueOf, labelOf = (value) => value) {
  const seen = new Map()
  for (const row of rows || []) {
    const value = valueOf(row)
    if (value === undefined || value === null || value === "") continue
    if (!seen.has(String(value))) seen.set(String(value), { value: String(value), label: labelOf(value, row) })
  }
  return [...seen.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)))
}
