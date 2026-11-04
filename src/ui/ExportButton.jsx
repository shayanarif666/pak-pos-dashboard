import { useEffect, useRef, useState } from "react"
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react"
import { downloadTables } from "../lib/exportFile.js"
import { useToast } from "./Toast.jsx"

const FORMATS = [
  { id: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { id: "csv", label: "CSV (.csv)", icon: FileText },
]

/**
 * Export: one button; its menu picks Excel or CSV and downloads. getTables() returns (or
 * resolves to) the tables to save; name is the file name (the date is added).
 */
export function ExportButton({ getTables, name, disabled = false, className = "", block = false }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => event.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  async function run(format) {
    setOpen(false)
    setBusy(true)
    try {
      const tables = await getTables()
      downloadTables(tables, { name: typeof name === "function" ? name() : name, format })
      toast("Export downloaded")
    } catch (err) {
      toast(err.message || "Export failed", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={ref} className={`relative ${block ? "w-full" : ""} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-brand-700 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50 ${block ? "w-full" : ""}`}
      >
        <Download className="h-4 w-4" />
        {busy ? "Exporting…" : "Export"}
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.25)]">
          {FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              role="menuitem"
              onClick={() => run(format.id)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-800"
            >
              <format.icon className="h-4 w-4" />
              {format.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
