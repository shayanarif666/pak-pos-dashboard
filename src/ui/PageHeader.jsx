/** Page title block: section eyebrow, title, one-line description and actions on the right. */
export function PageHeader({ section, title, description, actions = null, children = null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {section ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{section}</p> : null}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** A row of summary cards above a table: { label, value, hint?, icon? }. */
export function StatCards({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            {item.icon ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
                <item.icon className="h-4 w-4" />
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs text-slate-500">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
