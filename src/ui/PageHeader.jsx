/** The look of the header's round icon buttons (search, filters…). */
export const headerIconButton = (active = false) =>
  [
    "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition",
    active
      ? "border-brand-700 bg-brand-700 text-white shadow-[0_8px_18px_-8px_rgba(19,92,76,0.7)]"
      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand-700 hover:text-brand-700",
  ].join(" ")

/**
 * The page's header panel, the same on every module: section eyebrow, label, description on the
 * left; on the right the tools — Search and Filters (placed here by the page's table, through the
 * data-table-search / data-table-filters slots), then the page's own actions (Export, Add…).
 */
export function PageHeader({ section, title, description, actions = null, children = null, back = null, className = "" }) {
  return (
    <div className={`relative rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-28px_rgba(19,92,76,0.35)] sm:px-6 ${className}`}>
      {/* A soft brand glow in the corner. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-100/60 blur-3xl" />
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[16rem] flex-1">
          {back}
          {section ? (
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
              {section}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p> : null}
          {children}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span data-table-search className="contents" />
          <span data-table-filters className="contents" />
          {actions}
        </div>
      </div>
    </div>
  )
}

/** A row of summary cards above a table: { label, value, hint?, icon? }. */
export function StatCards({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            {item.icon ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
                <item.icon className="h-4 w-4" />
              </span>
            ) : null}
          </div>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs text-slate-500">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
