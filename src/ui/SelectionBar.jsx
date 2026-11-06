import { X } from "lucide-react"

/**
 * Floating bar at the bottom of the page while table rows are selected:
 * "N {noun} selected", Clear, then the page's actions (children).
 */
export function SelectionBar({ count, noun = ["item", "items"], onClear, children }) {
  if (!count) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white py-2.5 pl-4 pr-2.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        <span className="text-sm font-semibold text-slate-900">
          {count} {count === 1 ? noun[0] : noun[1]} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-4 w-4" /> Clear
        </button>
        {children}
      </div>
    </div>
  )
}
