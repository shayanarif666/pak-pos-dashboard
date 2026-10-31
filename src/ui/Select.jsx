import { ChevronDown } from "lucide-react"

const fieldClass =
  "h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-400 focus:border-brand-700 focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-50"

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
