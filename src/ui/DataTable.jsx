import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, RotateCcw, Search, X } from "lucide-react"
import { PageLoader } from "./Spinner.jsx"

const PAGE_SIZES = [10, 20, 50, 100]

const fieldBase =
  "h-10 w-full rounded-xl border px-3 text-sm font-medium outline-none transition focus:ring-4 focus:ring-slate-900/10"
const inputClass = `${fieldBase} border-slate-200 bg-white text-slate-900 hover:border-slate-400 focus:border-brand-700`
// A dropdown with a value turns black, so the active filters stand out.
const selectClass = (active) =>
  active ? `select-ui is-active ${fieldBase} border-brand-700 bg-brand-700 text-white` : `select-ui ${inputClass}`
// A chosen date keeps a white field (readable) with a black border.
const dateClass = (active) => (active ? `${fieldBase} border-brand-700 bg-white text-slate-950` : inputClass)

const pageBase = "inline-flex h-9 items-center justify-center rounded-xl border text-sm font-semibold transition"
// Colours are picked per state (two bg-* classes on one element would fight).
const pageButton = `${pageBase} border-slate-200 bg-white hover:border-brand-700 hover:text-brand-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:border-slate-100`
const pageButtonActive = `${pageBase} border-brand-700 bg-brand-700 text-white`

/** Page numbers to show: first, last and the ones around the current page, gaps as "…". */
function pageList(current, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1)
  const list = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(pages - 1, current + 1)
  if (start > 2) list.push("…")
  for (let page = start; page <= end; page += 1) list.push(page)
  if (end < pages - 1) list.push("…")
  list.push(pages)
  return list
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
 *   filters:  [{ key, label, options: [{ value, label }], match?(row, value), server? }]
 *             server: true = the page asks the API with it (onFiltersChange) instead of matching rows here
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
  initialFilters = {},
  onFiltersChange = null,
}) {
  const [query, setQuery] = useState("")
  const [filterValues, setFilterValues] = useState(initialFilters)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  // Dates typed in the inputs; they filter only after Apply Filter.
  const [draftFrom, setDraftFrom] = useState("")
  const [draftTo, setDraftTo] = useState("")
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

  useEffect(() => {
    onFiltersChange?.(filterValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues])

  const visible = useMemo(() => {
    if (server) return rows
    let list = rows
    const needle = query.trim().toLowerCase()
    if (needle && search?.text) {
      list = list.filter((row) => String(search.text(row) ?? "").toLowerCase().includes(needle))
    }
    for (const filter of filters) {
      if (filter.server) continue
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
  const hasFilters = Boolean(query || from || to || draftFrom || draftTo || Object.values(filterValues).some((v) => v !== "" && v != null))

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
    setDraftFrom("")
    setDraftTo("")
  }

  function applyDates() {
    setFrom(draftFrom)
    setTo(draftTo)
  }
  const datesPending = draftFrom !== from || draftTo !== to

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      {search || filters.length || dateRange || toolbar ? (
        <div className="space-y-3 border-b border-slate-100 px-4 py-4">
          {/* Row 1: search (full width), clear and page actions. */}
          {search || (hasFilters && !dateRange) || toolbar ? (
            <div className="flex flex-wrap items-center gap-3">
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
              {hasFilters && !dateRange ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-brand-700 hover:text-brand-700"
                >
                  <X className="h-4 w-4" /> Clear
                </button>
              ) : null}
              {toolbar ? <div className="ml-auto flex items-center gap-2">{toolbar}</div> : null}
            </div>
          ) : null}
          {/* Row 2+: the filters and dates, four to a row. */}
          {filters.length || dateRange ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {filters.map((filter) => (
                <label key={filter.key} className="min-w-0 text-xs font-medium text-slate-500">
                  <span className="mb-1 block">{filter.label}</span>
                  <select
                    className={selectClass(Boolean(filterValues[filter.key]))}
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
                  <label className="min-w-0 text-xs font-medium text-slate-500">
                    <span className="mb-1 block">{dateRange.label ? `${dateRange.label} from` : "From"}</span>
                    <input type="date" className={dateClass(Boolean(from))} value={draftFrom} max={draftTo || undefined} onChange={(event) => setDraftFrom(event.target.value)} />
                  </label>
                  <label className="min-w-0 text-xs font-medium text-slate-500">
                    <span className="mb-1 block">{dateRange.label ? `${dateRange.label} to` : "To"}</span>
                    <input type="date" className={dateClass(Boolean(to))} value={draftTo} min={draftFrom || undefined} onChange={(event) => setDraftTo(event.target.value)} />
                  </label>
                  <div className="col-span-2 flex items-end gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
                    <button
                      type="button"
                      onClick={applyDates}
                      disabled={!datesPending}
                      className="h-10 whitespace-nowrap rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Apply Filter
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      disabled={!hasFilters}
                      className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-brand-700 hover:text-brand-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" /> Reset Filters
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="px-5 py-3 text-sm text-rose-700">{error.message || String(error)}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
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
                    onRowClick ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50/60",
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

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
        <p>
          Showing <span className="font-semibold text-slate-950">{firstShown}–{lastShown}</span> of{" "}
          <span className="font-semibold text-slate-950">{total}</span> {total === 1 ? "result" : "results"}
        </p>

        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
            className={`${pageButton} gap-1 px-3 text-slate-700`}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          {pageList(current, pages).map((item, index) =>
            item === "…" ? (
              <span key={`gap-${index}`} className="px-1 text-slate-400">…</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                aria-current={item === current ? "page" : undefined}
                className={item === current ? `${pageButtonActive} w-9` : `${pageButton} w-9 text-slate-700`}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
            className={`${pageButton} gap-1 px-3 text-slate-700`}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            className="select-ui h-9 rounded-xl border border-slate-200 bg-white pl-3 text-sm font-semibold text-slate-900 outline-none hover:border-slate-400 focus:border-brand-700"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
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
