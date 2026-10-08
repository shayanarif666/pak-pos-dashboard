import { useState } from "react"
import { Eye } from "lucide-react"
import {
  useAddOrderPayment,
  useConfirmPayment,
  useOrderPaymentsQuery,
  useOrderReceiptQuery,
  useOrdersQuery,
} from "../../features/orders/orderQuery.js"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { LocationSelect } from "../../features/orders/LocationSales.jsx"

const emptyPayment = {
  method: "cash",
  amount: "",
}

export function TransactionsPage() {
  const { toast } = useToast()
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [form, setForm] = useState(emptyPayment)
  const [locationId, setLocationId] = useState("")
  const ordersQuery = useOrdersQuery(locationId ? { location_id: locationId } : {})
  const paymentsQuery = useOrderPaymentsQuery(selectedOrder?.id, { enabled: Boolean(selectedOrder) })
  const receiptQuery = useOrderReceiptQuery(selectedOrder?.id, { enabled: Boolean(selectedOrder && receiptOpen) })
  const addPayment = useAddOrderPayment()
  const confirmPayment = useConfirmPayment()
  const orders = ordersQuery.data || []

  async function savePayment(event) {
    event.preventDefault()
    if (!selectedOrder) return
    try {
      await addPayment.mutateAsync({
        id: selectedOrder.id,
        body: {
          method: form.method,
          amount: Number(form.amount),
        },
      })
      toast("Payment added")
      setForm(emptyPayment)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function confirm(row) {
    try {
      await confirmPayment.mutateAsync(row.id)
      toast("Payment confirmed")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">Select an order to view payments, add split payments, confirm payments, and load receipts.</p>
        </div>
        <LocationSelect
          className="min-w-56"
          value={locationId}
          onChange={(value) => {
            setLocationId(value)
            setSelectedOrder(null)
          }}
        />
      </div>

      {ordersQuery.isPending ? <PageLoader label="Loading orders…" /> : null}
      {ordersQuery.error ? <p className="text-sm text-rose-700">{ordersQuery.error.message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-3">
          {orders.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setSelectedOrder(row)
                setReceiptOpen(false)
              }}
              className={[
                "rounded-[24px] border px-5 py-4 text-left transition",
                selectedOrder?.id === row.id
                  ? "border-brand-300 bg-brand-50"
                  : "border-slate-200 bg-white hover:border-brand-300",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">Order #{row.order_number}</p>
                  <p className="text-sm text-slate-600">{row.payment_method} · <Currency value={row.total_amount} /></p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge value={row.payment_status} />
                  <StatusBadge value={row.channel} />
                </div>
              </div>
            </button>
          ))}
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-5">
          {selectedOrder ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Order #{selectedOrder.order_number}</h2>
                  <p className="text-sm text-slate-500">Total <Currency value={selectedOrder.total_amount} /></p>
                </div>
                <Button variant="icon" aria-label="Load receipt" onClick={() => setReceiptOpen(true)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={savePayment} className="mb-5 grid gap-3">
                <Select label="Payment method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">Easypaisa</option>
                  <option value="cod">COD</option>
                </Select>
                <Input label="Amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <Button type="submit" disabled={addPayment.isPending}>Add payment</Button>
                <p className="text-xs text-slate-500">Backend may reject this for Store Admin if only manager/cashier can collect payment.</p>
              </form>

              {paymentsQuery.isPending ? <PageLoader label="Loading payments…" /> : null}
              <div className="grid gap-2">
                {(paymentsQuery.data || []).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <StatusBadge value={row.method} />
                        <p className="text-sm text-slate-500"><Currency value={row.amount} /></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={row.status} />
                        {row.status !== "success" ? (
                          <Button variant="ghost" onClick={() => confirm(row)} disabled={confirmPayment.isPending}>
                            Confirm
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {receiptOpen ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">Receipt</h3>
                  {receiptQuery.isPending ? <PageLoader label="Loading receipt…" /> : null}
                  {receiptQuery.error ? <p className="text-sm text-rose-700">{receiptQuery.error.message}</p> : null}
                  {receiptQuery.data ? (
                    <pre className="max-h-72 overflow-auto rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
                      {JSON.stringify(receiptQuery.data, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">Select an order to view transactions.</p>
          )}
        </aside>
      </div>
    </section>
  )
}
