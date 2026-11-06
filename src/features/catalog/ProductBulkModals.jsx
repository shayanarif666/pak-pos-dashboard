import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useBulkProductStatus } from "./catalogQuery.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { useToast } from "../../ui/Toast.jsx"

const plural = (count) => (count === 1 ? "1 product" : `${count} products`)

/** "Updated 3 products" or, when some rows failed, which ones and why. */
function resultMessage(json, sent, rows) {
  const failed = json?.failed || []
  if (!failed.length) return { text: `Updated ${plural(sent)}`, tone: "success" }
  const names = failed.map((row) => rows[row.index]?.title || `#${rows[row.index]?.product_number}`).join(", ")
  return { text: `Updated ${plural(sent - failed.length)}. Not updated: ${names} — ${failed[0].message}`, tone: "error" }
}

function ModalShell({ open, onClose, title, subtitle, onSubmit, error, pending, submitLabel, disabled, children }) {
  return (
    <Modal open={Boolean(open)} onClose={onClose} size="md">
      <form onSubmit={onSubmit} className="max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" className="text-slate-600 hover:text-brand-700" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-slate-600">{subtitle}</p>
        {children}
        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending || disabled}>{pending ? "Saving…" : submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}

function StatusOption({ checked, title, hint, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={[
        "rounded-xl border px-3 py-2.5 text-left transition",
        checked ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 bg-white hover:border-brand-300",
      ].join(" ")}
    >
      <span className="block text-sm font-semibold text-slate-900">{title}</span>
      <span className="block text-xs text-slate-500">{hint}</span>
    </button>
  )
}

/** Active (on sale) or Disabled (off sale; the record, stock and sales history stay). */
export function ProductStatusModal({ open, products = [], onClose, onSaved }) {
  const { toast } = useToast()
  const mutation = useBulkProductStatus()
  const [active, setActive] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!open) return
    // All of them on sale already: start from Disabled; otherwise from Active.
    setActive(!products.every((row) => row.is_active))
    setError("")
    // Only when the modal opens.
  }, [open])

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      const json = await mutation.mutateAsync(products.map((row) => ({ id: row.product_number, is_active: active })))
      const result = resultMessage(json, products.length, products)
      toast(result.text, result.tone === "error" ? "error" : undefined)
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Update status"
      subtitle={`Set the status of ${plural(products.length)}.`}
      onSubmit={save}
      error={error}
      pending={mutation.isPending}
      submitLabel="Update status"
      disabled={!products.length}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <StatusOption checked={active} title="Active" hint="On sale on the POS and the website" onSelect={() => setActive(true)} />
        <StatusOption checked={!active} title="Disabled" hint="Off sale; stock and sales history stay" onSelect={() => setActive(false)} />
      </div>
    </ModalShell>
  )
}
