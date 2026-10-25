/** Page title block: section eyebrow, title, one-line description and actions on the right. */
export function PageHeader({ section, title, description, actions = null, children = null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {section ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{section}</p> : null}
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** A row of small totals above a table. */
export function StatCards({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  )
}
