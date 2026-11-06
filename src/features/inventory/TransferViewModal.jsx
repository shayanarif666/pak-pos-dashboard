import { X } from "lucide-react"
import { Modal } from "../../ui/Modal.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { formatDateTime } from "../../ui/format.js"

function Field({ title, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children ?? "—"}</dd>
    </div>
  )
}

const qtyText = (value) => (value == null ? "—" : String(Number(value)))

/**
 * Stock Transfers → eye icon: the whole transfer — source, date, who sent it, note, and per
 * destination every product with the qty sent, the qty received and its status.
 */
export function TransferViewModal({ transfer, onClose, locationName, productName, staffName }) {
  const row = transfer
  const total = (row?.destinations || []).reduce((sum, dest) => sum + dest.products.reduce((s, line) => s + Number(line.qty || 0), 0), 0)
  return (
    <Modal open={Boolean(row)} onClose={onClose} size="lg">
      {row ? (
        <div className="max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transfer #{row.transfer_number}</p>
              <h2 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                {locationName[row.from_location_id] || "—"} → {(row.destinations || []).map((dest) => locationName[dest.to_location_id] || "—").join(", ")}
                <StatusBadge value={row.status} />
              </h2>
            </div>
            <button type="button" className="text-slate-600 hover:text-brand-700" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <dl className="mb-5 grid gap-4 sm:grid-cols-3">
            <Field title="From">{locationName[row.from_location_id]}</Field>
            <Field title="Date">{formatDateTime(row.created_at)}</Field>
            <Field title="By">{row.created_by ? staffName(row.created_by) : null}</Field>
            <Field title="Total qty">{total}</Field>
            <Field title="Destinations">{(row.destinations || []).length}</Field>
            <Field title="Last updated">{row.updated_at ? formatDateTime(row.updated_at) : null}</Field>
          </dl>
          {row.note ? (
            <div className="mb-5 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{row.note}</p>
            </div>
          ) : null}

          <div className="space-y-4">
            {(row.destinations || []).map((dest) => (
              <div key={dest.to_location_id} className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">To {locationName[dest.to_location_id] || "—"}</p>
                  <StatusBadge value={dest.status} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Product</th>
                        <th className="px-3 py-2 text-right font-semibold">Sent</th>
                        <th className="px-3 py-2 text-right font-semibold">Received</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dest.products.map((line) => {
                        const short = line.received_qty != null && Number(line.received_qty) < Number(line.qty)
                        return (
                          <tr key={line.item_number ?? line.product_id} className="border-t border-slate-100">
                            <td className="px-4 py-2 font-medium text-slate-900">{productName[line.product_id] || "Product"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{qtyText(line.qty)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${short ? "font-semibold text-rose-700" : ""}`}>{qtyText(line.received_qty)}</td>
                            <td className="px-4 py-2">
                              <StatusBadge value={line.status} />
                              {line.received_at ? <span className="ml-2 text-xs text-slate-500">{formatDateTime(line.received_at)}</span> : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
