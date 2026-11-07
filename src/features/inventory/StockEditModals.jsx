import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useStockEdit } from "./inventoryQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Select } from "../../ui/Select.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { unitShort } from "../../ui/units.js"

// Reasons per type (as on Record movement); opening_balance only stays on its own movement.
export const REASONS_BY_TYPE = {
  stock_in: ["purchase", "customer_return", "other"],
  stock_out: ["damage", "expiry", "waste", "theft", "return_to_supplier", "other"],
  adjustment: ["count", "other"],
}
const TYPES = [
  ["stock_in", "Stock in (adds)"],
  ["stock_out", "Stock out (takes away)"],
  ["adjustment", "Adjustment (+ or −)"],
]
// Written by a sale, refund or transfer: those are never edited from here.
const LOCKED_REASONS = ["sale", "refund", "transfer", "custom_sale"]

export const label = (value) => String(value || "").replaceAll("_", " ")

/** Whether a movement can be edited / deleted (manual stock in / out / adjustment only). */
export function movementEditable(row) {
  return ["stock_in", "stock_out", "adjustment"].includes(row.movement_type) && !LOCKED_REASONS.includes(row.reason) && !row.order_id
}

function Shell({ open, onClose, title, subtitle, onSubmit, error, pending, submitLabel, children }) {
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
        <div className="grid gap-4">{children}</div>
        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}

/** The signed qty a movement moves: stock_in adds, stock_out takes away, an adjustment keeps its sign. */
function signed(type, qty) {
  const value = Number(qty)
  if (type === "stock_in") return Math.abs(value)
  if (type === "stock_out") return -Math.abs(value)
  return value
}

/** Stock Movements → Edit: type, reason, qty, note. The difference goes on the stock at once. */
export function MovementEditModal({ movement, onClose, productLabel }) {
  const { toast } = useToast()
  const { updateMovement } = useStockEdit()
  const [form, setForm] = useState({ movement_type: "stock_in", reason: "purchase", qty: "", reason_note: "" })
  const [error, setError] = useState("")
  useEffect(() => {
    if (!movement) return
    setForm({
      movement_type: movement.movement_type,
      reason: movement.reason,
      qty: String(movement.movement_type === "adjustment" ? Number(movement.qty) : Math.abs(Number(movement.qty))),
      reason_note: movement.reason_note || "",
    })
    setError("")
  }, [movement])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const reasons = [
    ...(movement?.reason === "opening_balance" ? ["opening_balance"] : []),
    ...(REASONS_BY_TYPE[form.movement_type] || []),
  ]
  const setType = (type) =>
    setForm((current) => ({
      ...current,
      movement_type: type,
      reason: (REASONS_BY_TYPE[type] || []).includes(current.reason) || current.reason === "opening_balance" ? current.reason : REASONS_BY_TYPE[type][0],
    }))

  const oldQty = Number(movement?.qty || 0)
  const nextQty = form.qty === "" || Number.isNaN(Number(form.qty)) ? null : signed(form.movement_type, form.qty)
  const diff = nextQty == null ? 0 : nextQty - oldQty

  async function save(event) {
    event.preventDefault()
    setError("")
    if (!nextQty) return setError("Enter a quantity other than 0.")
    try {
      await updateMovement.mutateAsync({
        id: movement.movement_number ?? movement.id,
        body: {
          movement_type: form.movement_type,
          reason: form.reason,
          qty: Number(form.qty),
          reason_note: form.reason_note.trim() || null,
        },
      })
      toast("Movement updated — stock corrected")
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Shell
      open={Boolean(movement)}
      onClose={onClose}
      title="Edit movement"
      subtitle={movement ? `${productLabel(movement)} at ${movement.location_name || "this location"}. The change is put on the stock at once.` : ""}
      onSubmit={save}
      error={error}
      pending={updateMovement.isPending}
      submitLabel="Save"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Type" value={form.movement_type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </Select>
        <Select label="Reason" value={form.reason} onChange={(e) => set("reason", e.target.value)}>
          {reasons.map((value) => <option key={value} value={value} className="capitalize">{label(value)}</option>)}
        </Select>
      </div>
      <Input
        label={form.movement_type === "adjustment" ? "Quantity (+ adds, − takes away)" : "Quantity"}
        type="number"
        step="any"
        min={form.movement_type === "adjustment" ? undefined : "0"}
        value={form.qty}
        onChange={(e) => set("qty", e.target.value)}
      />
      <Textarea label="Note" value={form.reason_note} onChange={(e) => set("reason_note", e.target.value)} placeholder="Why it changed" />
      {diff ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Stock at this location will go {diff > 0 ? "up" : "down"} by <span className="font-semibold">{Math.abs(diff)}</span>
          {movement?.qty_after != null ? <> (this movement: stock after {movement.qty_after} → {Number(movement.qty_after) + diff})</> : null}.
        </p>
      ) : null}
    </Shell>
  )
}

/** "loose" | "pack" (whole packs only) | "pack_loose" (packs, and single units sold loose too). */
export function stockKind(row) {
  if (!row?.is_pack_product || !(Number(row.pack_size) >= 2)) return "loose"
  return row.sell_loose ? "pack_loose" : "pack"
}

const qtyText = (value) => String(Math.round(Number(value || 0) * 10000) / 10000)

/**
 * Product Stock & Expiry → Edit. The stock is asked the way the product is sold:
 * - loose item: quantity (units)
 * - pack item: number of packs (total units = packs × pack size)
 * - pack + loose: packs and loose units, with the total
 * plus expiry date and the low-stock alert (starts on the level set on the product).
 */
export function StockEntryEditModal({ entry, lot = null, onClose }) {
  const { toast } = useToast()
  const { updateEntry } = useStockEdit()
  // A lot: its qty and expiry date are what this form edits (the rest of the stock stays).
  const baseStock = entry?.stocks?.[0] || null
  const stock = baseStock && lot ? { ...baseStock, qty: lot.qty, expiry_date: lot.expiry_date } : baseStock
  const kind = stockKind(entry)
  const packSize = Number(entry?.pack_size) || 1
  const unit = unitShort(entry?.unit)
  // The level that applies now: this location's own, else the one set when the product was created.
  const defaultThreshold = stock?.effective_threshold ?? (entry?.low_stock_threshold == null ? null : Number(entry.low_stock_threshold))
  const [form, setForm] = useState({ qty: "", packs: "", loose: "", expiry_date: "", low_stock_threshold: "", reason: "count", reason_note: "" })
  const [error, setError] = useState("")
  useEffect(() => {
    if (!stock) return
    const qty = Number(stock.qty || 0)
    const packs = kind === "loose" ? 0 : Math.floor(qty / packSize)
    setForm({
      qty: qtyText(qty),
      packs: String(packs),
      loose: qtyText(qty - packs * packSize),
      expiry_date: String(stock.expiry_date || entry.expiry_date || "").slice(0, 10),
      low_stock_threshold: defaultThreshold == null ? "" : qtyText(defaultThreshold),
      reason: "count",
      reason_note: "",
    })
    setError("")
    // Only when another entry is opened.
  }, [entry, lot])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const oldQty = Number(stock?.qty || 0)
  const total =
    kind === "loose"
      ? Number(form.qty || 0)
      : Number(form.packs || 0) * packSize + (kind === "pack_loose" ? Number(form.loose || 0) : 0)
  const qtyChanged = Boolean(stock) && total !== oldQty
  // A pack-only item with single units left over (e.g. after a damage): saving packs drops them.
  const leftover = kind === "pack" ? Math.round((oldQty - Math.floor(oldQty / packSize) * packSize) * 10000) / 10000 : 0

  async function save(event) {
    event.preventDefault()
    setError("")
    if (kind === "loose" && (form.qty === "" || Number(form.qty) < 0)) return setError("Quantity must be 0 or more.")
    if (kind !== "loose" && (form.packs === "" || Number(form.packs) < 0 || !Number.isInteger(Number(form.packs)))) {
      return setError("Number of packs must be a whole number, 0 or more.")
    }
    if (kind === "pack_loose" && (form.loose === "" || Number(form.loose) < 0)) return setError("Loose units must be 0 or more.")

    const item = { product_id: entry.product_number ?? entry.id, location_id: stock.location_number ?? entry.location_number, ...(lot ? { lot_id: lot.id } : {}) }
    const baseKeys = Object.keys(item).length
    if (qtyChanged) {
      if (kind === "loose") item.qty = Number(form.qty)
      else {
        item.number_of_packs = Number(form.packs)
        if (kind === "pack_loose") item.loose_units = Number(form.loose)
      }
      item.reason = form.reason
      item.reason_note = form.reason_note.trim() || null
    }
    const expiry = form.expiry_date || null
    if (expiry !== (String(stock.expiry_date || "").slice(0, 10) || null)) item.expiry_date = expiry
    const threshold = form.low_stock_threshold === "" ? null : Number(form.low_stock_threshold)
    if (threshold !== defaultThreshold) item.low_stock_threshold = threshold
    if (Object.keys(item).length === baseKeys) return onClose()
    try {
      await updateEntry.mutateAsync(item)
      toast(qtyChanged ? "Stock updated — adjustment recorded" : "Stock updated")
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  const kindLabel = { loose: "Loose item", pack: `Pack item · ${packSize} per pack`, pack_loose: `Pack + loose · ${packSize} per pack` }[kind]

  return (
    <Shell
      open={Boolean(entry)}
      onClose={onClose}
      title="Edit stock"
      subtitle={entry ? `${entry.title}${lot ? ` · Lot #${lot.id}` : ""} at ${stock?.location_name || entry.location_name || "this location"} — ${kindLabel}. A new quantity is saved as an adjustment movement${lot ? " on this lot" : ""}.` : ""}
      onSubmit={save}
      error={error}
      pending={updateEntry.isPending}
      submitLabel="Save"
    >
      {kind === "loose" ? (
        <Input label={`Quantity (${unit})`} type="number" min="0" step="any" value={form.qty} onChange={(e) => set("qty", e.target.value)} />
      ) : (
        <div className={`grid gap-3 ${kind === "pack_loose" ? "sm:grid-cols-2" : ""}`}>
          <Input label="Number of packs" type="number" min="0" step="1" value={form.packs} onChange={(e) => set("packs", e.target.value)} />
          {kind === "pack_loose" ? (
            <Input label={`Loose units (${unit})`} type="number" min="0" step="any" value={form.loose} onChange={(e) => set("loose", e.target.value)} />
          ) : null}
        </div>
      )}
      {kind !== "loose" ? (
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Number of packs</p>
            <p className="font-semibold text-slate-900">{Number(form.packs || 0)} × {packSize}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total units</p>
            <p className="font-semibold text-slate-900">{qtyText(total)} {unit}</p>
          </div>
        </div>
      ) : null}
      {leftover && !qtyChanged ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {qtyText(oldQty)} {unit} in stock now: {Math.floor(oldQty / packSize)} packs and {leftover} {unit} loose. Saving a new number of packs leaves out the single units.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Expiry date" type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
        <Input
          label={`Low-stock alert at (${unit})`}
          type="number"
          min="0"
          step="any"
          value={form.low_stock_threshold}
          onChange={(e) => set("low_stock_threshold", e.target.value)}
          placeholder="Product's level"
        />
      </div>
      {entry?.low_stock_threshold != null ? (
        <p className="-mt-2 text-xs text-slate-500">Set on the product: {qtyText(entry.low_stock_threshold)}. Change it here for this location only.</p>
      ) : null}
      {qtyChanged ? (
        <>
          <Select label="Reason for the change" value={form.reason} onChange={(e) => set("reason", e.target.value)}>
            {["count", "purchase", "damage", "expiry", "waste", "theft", "other"].map((value) => <option key={value} value={value} className="capitalize">{label(value)}</option>)}
          </Select>
          <Textarea label="Note" value={form.reason_note} onChange={(e) => set("reason_note", e.target.value)} />
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {qtyText(oldQty)} → {qtyText(total)} {unit} ({total > oldQty ? "+" : ""}{qtyText(total - oldQty)}), saved as an adjustment movement.
          </p>
        </>
      ) : null}
    </Shell>
  )
}
