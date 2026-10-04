import { ChevronDown } from "lucide-react"

const fieldClass =
  "w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/15 disabled:opacity-50"

export function Select({ label, error, children, className = "", ...props }) {
  return (
    <label className={`block text-sm text-slate-700 ${className}`}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span> : null}
      <span className="relative block">
        <select className={fieldClass} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </span>
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : null}
    </label>
  )
}
