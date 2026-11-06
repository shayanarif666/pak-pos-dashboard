import { X } from "lucide-react"
import { Modal } from "../../ui/Modal.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { formatDateTime } from "../../ui/format.js"
import { label } from "./StockEditModals.jsx"

export function movementTone(type) {
  if (type === "stock_in" || type === "refund" || type === "transfer_in") return "emerald"
  if (type === "stock_out" || type === "sale" || type === "transfer_out") return "rose"
  return "amber"
}

function Field({ title, children, wide = false }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children ?? "—"}</dd>
    </div>
  )
}

/** Stock Movements → eye icon: every detail of one movement. */
export function MovementViewModal({ movement, onClose, staffName }) {
  const row = movement
  const qty = Number(row?.qty || 0)
  const by = row?.staff_id ? row.staff?.name || staffName?.(row.staff_id) || "—" : "System"
  return (
    <Modal open={Boolean(row)} onClose={onClose} size="md">
      {row ? (
        <div className="max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Movement #{row.movement_number ?? "—"}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{row.product?.title || "Product"}{row.variant?.name ? ` · ${row.variant.name}` : ""}</h2>
            </div>
            <button type="button" className="text-slate-600 hover:text-brand-700" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">Quantity</p>
              <p className={`text-xl font-semibold ${qty < 0 ? "text-rose-700" : "text-emerald-700"}`}>{qty > 0 ? "+" : ""}{qty}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">Stock after</p>
              <p className="text-xl font-semibold text-slate-900">{row.qty_after ?? "—"}</p>
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Field title="Status"><Pill tone={movementTone(row.movement_type)}>{label(row.movement_type)}</Pill></Field>
            <Field title="Reason"><span className="capitalize">{label(row.reason)}</span></Field>
            <Field title="Product">
              {row.product ? <>{row.product.title} <span className="text-slate-500">#{row.product.product_number}{row.product.sku ? ` · ${row.product.sku}` : ""}</span></> : null}
            </Field>
            <Field title="Variant">
              {row.variant ? <>{row.variant.name} <span className="text-slate-500">#{row.variant.variant_number}{row.variant.sku ? ` · ${row.variant.sku}` : ""}</span></> : null}
            </Field>
            <Field title="Location">{row.location_name ? <>{row.location_name}{row.location_number ? <span className="text-slate-500"> #{row.location_number}</span> : null}</> : null}</Field>
            <Field title="Unit">{row.product?.unit ? <span className="capitalize">{row.product.unit}</span> : null}</Field>
            <Field title="By">{by}{row.staff?.role ? <span className="capitalize text-slate-500"> · {label(row.staff.role)}</span> : null}</Field>
            <Field title="Supplier">{row.supplier ? <>{row.supplier.name} <span className="text-slate-500">#{row.supplier.supplier_number}</span></> : null}</Field>
            <Field title="Date">{formatDateTime(row.created_at)}</Field>
            <Field title="Last edited">{row.updated_at ? formatDateTime(row.updated_at) : "Never"}</Field>
            {row.order_id ? <Field title="Order">Linked to a sale / refund</Field> : null}
            <Field title="Note" wide>{row.reason_note ? <span className="whitespace-pre-wrap">{row.reason_note}</span> : null}</Field>
          </dl>
        </div>
      ) : null}
    </Modal>
  )
}
