import { useState } from "react"
import { Eye } from "lucide-react"
import {
  useRefundReceiptQuery,
  useRefundsQuery,
} from "../../features/orders/orderQuery.js"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"

import { PageLoader } from "../../ui/Spinner.jsx"
import { Pill, StatusBadge } from "../../ui/Pill.jsx"
import { LocationSelect } from "../../features/orders/LocationSales.jsx"

/** locationId: branch chosen by the parent page; otherwise the page shows its own location filter. */
export function RefundsPage({ embedded = false, locationId }) {
  const [selected, setSelected] = useState(null)
  const [ownLocation, setOwnLocation] = useState("")
  const controlled = locationId !== undefined
  const location = controlled ? locationId : ownLocation
  const refundsQuery = useRefundsQuery(location ? { location_id: location } : {})
  const receiptQuery = useRefundReceiptQuery(selected?.order_id, selected?.id, { enabled: Boolean(selected) })
  const rows = refundsQuery.data || []

  return (
    <section>
      <div className={embedded ? "hidden" : "mb-6"}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Refunds</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lists complete and partial refunds. Partial refunds are item-level refunds while the order remains completed.
        </p>
      </div>

      {!controlled ? (
        <div className="mb-4 max-w-xs">
          <LocationSelect value={ownLocation} onChange={setOwnLocation} />
        </div>
      ) : null}

      {refundsQuery.isPending ? <PageLoader label="Loading refunds…" /> : null}
      {refundsQuery.error ? <p className="mb-4 text-sm text-rose-700">{refundsQuery.error.message}</p> : null}

      <div className="grid gap-3">
        {rows.map((row) => {
          const kind = row.order_status === "refunded" ? "complete" : "partial"
          return (
            <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">Refund for order #{row.order_number || row.order_id}</p>
                  <Pill tone={kind === "complete" ? "emerald" : "amber"}>{kind}</Pill>
                  <StatusBadge value={row.order_status} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {row.item_title || "Order refund"} · Qty {row.quantity} · {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                </p>
                {row.reason ? <p className="text-xs text-slate-500">Reason: {row.reason}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900"><Currency value={row.amount} /></p>
                <Button variant="icon" aria-label="View refund receipt" onClick={() => setSelected(row)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </article>
          )
        })}
      </div>
      {!refundsQuery.isPending && !rows.length ? <p className="mt-8 text-sm text-slate-500">No refunds found.</p> : null}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="w-full max-w-3xl rounded-3xl border border-slate-300 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Refund receipt</h2>
              <button type="button" className="text-slate-600 hover:text-brand-700" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            {receiptQuery.isPending ? <PageLoader label="Loading refund receipt…" /> : null}
            {receiptQuery.error ? <p className="text-sm text-rose-700">{receiptQuery.error.message}</p> : null}
            {receiptQuery.data ? (
              <pre className="max-h-[70vh] overflow-auto rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
                {JSON.stringify(receiptQuery.data, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
