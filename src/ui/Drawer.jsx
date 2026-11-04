import { useEffect } from "react"
import { X } from "lucide-react"

/** A panel that slides in from the right (filters, export…). Esc or the backdrop closes it. */
export function Drawer({ open, onClose, title, children, footer = null }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-950/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={title}
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-[0_0_60px_rgba(15,23,42,0.25)] transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-slate-200 px-5 py-4">{footer}</div> : null}
      </aside>
    </div>
  )
}
