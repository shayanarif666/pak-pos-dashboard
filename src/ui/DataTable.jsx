import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Inbox, ListFilter, RotateCcw, Search, X } from "lucide-react"
import { Drawer } from "./Drawer.jsx"
import { headerIconButton } from "./PageHeader.jsx"
import { alignClass, table as ui } from "./tableStyles.js"

const PAGE_SIZES = [10, 20, 50, 100]

const fieldBase =
  "h-11 w-full rounded-xl border px-3.5 text-sm font-medium outline-none transition focus:ring-4 focus:ring-slate-900/10"
const inputClass = `${fieldBase} border-slate-200 bg-white text-slate-900 hover:border-slate-400 focus:border-brand-700`
// A dropdown with a value turns green, so the active filters stand out.
const selectClass = (active) =>
  active ? `select-ui is-active ${fieldBase} border-brand-700 bg-brand-700 text-white` : `select-ui ${inputClass}`

const pageBase = "inline-flex h-9 items-center justify-center rounded-xl border text-sm font-semibold transition"
// Colours are picked per state (two bg-* classes on one element would fight).
const pageButton = `${pageBase} border-slate-200 bg-white hover:border-brand-700 hover:text-brand-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:border-slate-100`
const pageButtonActive = `${pageBase} border-brand-700 bg-brand-700 text-white shadow-[0_6px_14px_-6px_rgba(19,92,76,0.6)]`

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

const hasValue = (value) => value !== undefined && value !== null && value !== ""

/**
 * The dashboard's list table: sorting and pagination, with search, dropdown filters and the date
 * range in a drawer. The drawer opens from a filter icon placed in the page header (the
 * [data-table-filters] slot of PageHeader), or above the table when the page has no slot; the
 * filters apply on "Apply filters" and the active ones show as chips above the table.
 *
 *   title:    names the drawer ("Filter products")
 *   columns:  [{ key, header, render?(row), sortValue?(row), align?: "right" | "center", className? }]
 *   rows:     the list (client mode: every row; server mode: the current page)
 *   search:   { placeholder, text(row) }          — client mode matches text(row)
 *   filters:  [{ key, label, options: [{ value, label }], match?(row, value), server? }]
 *             server: true = the page asks the API with it (onFiltersChange) instead of matching rows here
 *   dateRange:{ label?, value(row) }              — from / to (client mode filters by value(row))
 *   server:   { total, onChange({ page, limit, search, filters, from, to }) } — the API pages / filters
 *   toolbar:  buttons shown at the end of the label row, before Filters
 *   selection:{ selected: [rowKey...], onChange(nextKeys) } — a checkbox column first; the header
 *             box selects every row matching the search / filters (not only this page). A selected
 *             row hidden by a new search / filter leaves the selection.
 *
 * State (page, page size, search, filters, dates, sort) lives here; in server mode every change is
 * reported through server.onChange so the page can refetch.
 */
export function DataTable({
  title = null,
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
  selection = null,
  // (row) => node | null: a row with something to show opens under itself (a ▸ toggle first).
  renderExpanded = null,
}) {
  const [expanded, setExpanded] = useState(() => new Set())
  const toggleExpanded = (key) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const [query, setQuery] = useState("")
  const [filterValues, setFilterValues] = useState(initialFilters)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(defaultPageSize)
  // The drawer edits a draft; Apply filters makes it the table's.
  const [drawerOpen, setDrawerOpen] = useState(false)
  // The page header's slot for the filter icon (null = show it above the table).
  const cardRef = useRef(null)
  const [slot, setSlot] = useState(null)
  const [searchSlot, setSearchSlot] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  useLayoutEffect(() => {
    const page = cardRef.current?.closest("section") || document
    setSlot(page.querySelector("[data-table-filters]"))
    setSearchSlot(page.querySelector("[data-table-search]"))
  }, [])
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])
  const [draft, setDraft] = useState({ query: "", filters: initialFilters, from: "", to: "" })

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
      if (!hasValue(value)) continue
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

  // Row selection (checkbox column): kept to the rows the search / filters still show.
  const selectedKeys = selection?.selected || []
  const visibleKeys = useMemo(() => visible.map((row) => rowKey(row)), [visible, rowKey])
  useEffect(() => {
    if (!selection || loading) return
    const shown = new Set(visibleKeys)
    const kept = selectedKeys.filter((key) => shown.has(key))
    if (kept.length !== selectedKeys.length) selection.onChange(kept)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKeys, loading])
  const selectedSet = new Set(selectedKeys)
  const allShownSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selectedSet.has(key))
  const someShownSelected = !allShownSelected && visibleKeys.some((key) => selectedSet.has(key))
  const expandColumn = renderExpanded
    ? [{
        key: "__expand",
        sortable: false,
        className: "w-10",
        header: "",
        render: (row) => {
          const key = rowKey(row)
          const open = expanded.has(key)
          return (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "Hide details" : "Show details"}
              onClick={(event) => {
                event.stopPropagation()
                toggleExpanded(key)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-brand-50 hover:text-brand-700"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
          )
        },
      }]
    : []
  const tableColumns = selection
    ? [
        {
          key: "__select",
          sortable: false,
          className: "w-10",
          header: (
            <SelectBox
              label="Select all shown rows"
              checked={allShownSelected}
              indeterminate={someShownSelected}
              onChange={(checked) =>
                selection.onChange(
                  checked
                    ? [...new Set([...selectedKeys, ...visibleKeys])]
                    : selectedKeys.filter((key) => !visibleKeys.includes(key))
                )
              }
            />
          ),
          render: (row) => {
            const key = rowKey(row)
            return (
              <SelectBox
                label="Select row"
                checked={selectedSet.has(key)}
                onChange={(checked) =>
                  selection.onChange(checked ? [...selectedKeys, key] : selectedKeys.filter((value) => value !== key))
                }
              />
            )
          },
        },
        ...columns,
      ]
    : columns
  const shownColumns = [...expandColumn, ...tableColumns]

  const total = server ? Number(server.total || 0) : visible.length
  const pages = Math.max(1, Math.ceil(total / limit))
  const current = Math.min(page, pages)
  const pageRows = server ? visible : visible.slice((current - 1) * limit, current * limit)
  const firstShown = total ? (current - 1) * limit + 1 : 0
  const lastShown = Math.min(current * limit, total)
  const headerSearch = Boolean(search && searchSlot)
  const canFilter = Boolean((search && !headerSearch) || filters.length || dateRange)

  // The applied filters as chips: [{ id, label, clear() }].
  const chips = [
    // A header search shows its own text; the drawer's search shows as a chip.
    ...(query.trim() && !headerSearch ? [{ id: "search", label: `“${query.trim()}”`, clear: () => setQuery("") }] : []),
    ...filters
      .filter((filter) => hasValue(filterValues[filter.key]))
      .map((filter) => ({
        id: filter.key,
        label: `${filter.label}: ${filter.options.find((option) => String(option.value) === String(filterValues[filter.key]))?.label ?? filterValues[filter.key]}`,
        clear: () => setFilterValues((prev) => ({ ...prev, [filter.key]: "" })),
      })),
    ...(from || to
      ? [{ id: "dates", label: `${dateRange?.label || "Date"}: ${from || "…"} → ${to || "…"}`, clear: () => { setFrom(""); setTo("") } }]
      : []),
  ]
  const hasFilters = chips.length > 0
  const filtering = hasFilters || Boolean(query.trim())

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

  function openDrawer() {
    setDraft({ query, filters: filterValues, from, to })
    setDrawerOpen(true)
  }

  function applyDraft() {
    setQuery(draft.query)
    setFilterValues(draft.filters)
    setFrom(draft.from)
    setTo(draft.to)
    setDrawerOpen(false)
  }

  function clearAll() {
    setQuery("")
    setFilterValues({})
    setFrom("")
    setTo("")
    setDraft({ query: "", filters: {}, from: "", to: "" })
  }

  const searchBox = searchOpen || query ? (
    <label className="relative inline-flex h-11 w-full items-center sm:w-64">
      <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-brand-700" />
      <input
        ref={searchRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && (setQuery(""), setSearchOpen(false))}
        placeholder={search?.placeholder || "Search…"}
        className="h-11 w-full rounded-xl border border-brand-700 bg-white pl-10 pr-9 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-4 focus:ring-brand-700/10"
      />
      <button
        type="button"
        onClick={() => { setQuery(""); setSearchOpen(false) }}
        aria-label="Close search"
        className="absolute right-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </label>
  ) : (
    <button type="button" onClick={() => setSearchOpen(true)} title="Search" aria-label="Search" className={headerIconButton()}>
      <Search className="h-5 w-5" />
    </button>
  )

  const filterButton = (
    <button
      type="button"
      onClick={openDrawer}
      title="Filters"
      aria-label={hasFilters ? `Filters (${chips.length} on)` : "Filters"}
      className={headerIconButton(hasFilters)}
    >
      <ListFilter className="h-5 w-5" />
      {hasFilters ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-brand-700 ring-2 ring-brand-700">
          {chips.length}
        </span>
      ) : null}
    </button>
  )

  return (
    <div ref={cardRef} className={ui.card}>
      {toolbar || (canFilter && !slot) ? (
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 pt-4">
          {toolbar}
          {canFilter && !slot ? filterButton : null}
        </div>
      ) : null}
      {headerSearch ? createPortal(searchBox, searchSlot) : null}
      {canFilter && slot ? createPortal(filterButton, slot) : null}

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-5 py-3.5">
          {chips.map((chip) => (
            <span key={chip.id} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-brand-800">
              {chip.label}
              <button type="button" onClick={chip.clear} aria-label={`Remove ${chip.label}`} className="rounded-full p-0.5 hover:bg-brand-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button type="button" onClick={clearAll} className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-brand-700 hover:underline">
            Clear all
          </button>
        </div>
      ) : null}

      {error ? <p className="mx-5 mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error.message || String(error)}</p> : null}

      <div className={ui.scroll}>
        <table className={`${ui.table} min-w-[720px]`}>
          <thead className={ui.thead}>
            <tr>
              {shownColumns.map((column) => {
                const active = sort?.key === column.key
                const sortable = !server && column.sortable !== false
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={[ui.th, alignClass(column.align), sortable ? "group cursor-pointer select-none hover:text-slate-900" : ""].join(" ")}
                    onClick={() => toggleSort(column)}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <span className={`inline-flex items-center gap-1 ${column.align === "right" ? "flex-row-reverse" : ""}`}>
                      {column.header}
                      {active ? (
                        sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-brand-700" /> : <ArrowDown className="h-3.5 w-3.5 text-brand-700" />
                      ) : sortable && column.header ? (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60" />
                      ) : null}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <tr key={`skeleton-${index}`} className="border-b border-slate-100 last:border-0">
                  {shownColumns.map((column) => (
                    <td key={column.key} className={ui.td}>
                      <div className="h-3.5 animate-pulse rounded-full bg-slate-100" style={{ width: `${45 + ((index * 17 + column.key.length * 7) % 45)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length ? (
              pageRows.map((row, index) => {
                const key = rowKey(row) ?? index
                const open = renderExpanded && expanded.has(key)
                const detail = open ? renderExpanded(row) : null
                return [
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`${ui.tr} ${onRowClick ? "cursor-pointer" : ""} ${open ? "bg-slate-50/70" : ""}`}
                  >
                    {shownColumns.map((column) => (
                      <td key={column.key} className={[ui.td, alignClass(column.align), column.className || ""].join(" ")}>
                        {column.render ? column.render(row) : (row[column.key] ?? "—")}
                      </td>
                    ))}
                  </tr>,
                  detail ? (
                    <tr key={`${key}__detail`} className="border-b border-slate-100 bg-slate-50/70">
                      <td colSpan={shownColumns.length} className="px-4 pb-4 pt-0 sm:px-6">
                        {detail}
                      </td>
                    </tr>
                  ) : null,
                ]
              })
            ) : (
              <tr>
                <td colSpan={shownColumns.length} className={ui.empty}>
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Inbox className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-slate-700">{filtering ? "No rows match these filters." : emptyText}</p>
                  {filtering ? (
                    <button type="button" onClick={clearAll} className="mt-2 text-sm font-semibold text-brand-700 hover:underline">
                      Clear filters
                    </button>
                  ) : null}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={ui.footer}>
        <p>
          Showing <span className="font-semibold text-slate-950">{firstShown}–{lastShown}</span> of{" "}
          <span className="font-semibold text-slate-950">{total}</span> {total === 1 ? "result" : "results"}
        </p>

        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className={`${pageButton} gap-1 px-3 text-slate-700`}>
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
          <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className={`${pageButton} gap-1 px-3 text-slate-700`}>
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

      {canFilter ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={title ? `Filter ${String(title).toLowerCase()}` : "Filters"}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraft({ query: "", filters: {}, from: "", to: "" })}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:border-brand-700 hover:text-brand-700"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <button
                type="button"
                onClick={applyDraft}
                className="h-11 flex-1 rounded-xl bg-brand-700 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Apply filters
              </button>
            </div>
          }
        >
          {search && !headerSearch ? (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-600">Search</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputClass} pl-10`}
                  placeholder={search.placeholder || "Search…"}
                  value={draft.query}
                  onChange={(event) => setDraft((prev) => ({ ...prev, query: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && applyDraft()}
                />
              </span>
            </label>
          ) : null}
          {filters.map((filter) => (
            <label key={filter.key} className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-600">{filter.label}</span>
              <select
                className={selectClass(hasValue(draft.filters[filter.key]))}
                value={draft.filters[filter.key] ?? ""}
                onChange={(event) => setDraft((prev) => ({ ...prev, filters: { ...prev.filters, [filter.key]: event.target.value } }))}
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
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-600">{dateRange.label ? `${dateRange.label} from` : "From"}</span>
                <input type="date" className={inputClass} value={draft.from} max={draft.to || undefined} onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-600">{dateRange.label ? `${dateRange.label} to` : "To"}</span>
                <input type="date" className={inputClass} value={draft.to} min={draft.from || undefined} onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))} />
              </label>
            </div>
          ) : null}
        </Drawer>
      ) : null}
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

/** The selection column's checkbox: clicking it never opens the row or sorts the column. */
function SelectBox({ label, checked, indeterminate = false, onChange }) {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center" onClick={(event) => event.stopPropagation()}>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        ref={(node) => {
          if (node) node.indeterminate = indeterminate
        }}
        onChange={(event) => onChange(event.target.checked)}
        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 bg-white checked:border-brand-300 checked:bg-brand-700 indeterminate:border-brand-300 indeterminate:bg-brand-700"
      />
      <svg viewBox="0 0 16 16" className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M3 8.5 6.2 12 13 4.5" />
      </svg>
      {indeterminate ? <span className="pointer-events-none absolute h-0.5 w-2.5 rounded bg-white" /> : null}
    </span>
  )
}
