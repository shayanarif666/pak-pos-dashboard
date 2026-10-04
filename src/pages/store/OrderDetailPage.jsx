import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Printer } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { Currency } from "../../ui/Currency.jsx"
import {
  useCancelOrder,
  useOrderQuery,
  useOrderReceiptQuery,
  useRefundEntireOrder,
  useRefundOrderItem,
  useVoidOrder,
} from "../../features/orders/orderQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, StatusBadge } from "../../ui/Pill.jsx"

function formatDateTime(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function ReceiptLine({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{value}</span>
    </div>
  )
}

function OrderReceipt({ storeName, order, items, payments, receipt, customer, cashier }) {
  const receiptNumber = receipt?.receipt_number
  const issuedAt = receipt?.issued_at || order.placed_at
  const paid = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  return (
    <article className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-slate-300 bg-[#f7f4ef] text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="border-b border-dashed border-slate-300 px-6 py-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Receipt</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {storeName || "Store"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Order #{order.order_number}
          {receiptNumber != null ? ` · Receipt #${receiptNumber}` : ""}
        </p>
        <p className="mt-1 text-xs text-slate-500">{formatDateTime(issuedAt)}</p>
      </div>

      <div className="space-y-2 border-b border-dashed border-slate-300 px-6 py-4 text-sm">
        <ReceiptLine label="Channel" value={(order.channel || "—").toUpperCase()} />
        <ReceiptLine label="Status" value={order.order_status || "—"} />
        <ReceiptLine label="Payment" value={order.payment_status || "—"} />
        <ReceiptLine label="Method" value={order.payment_method || "—"} />
        {order.location_number != null ? (
          <ReceiptLine label="Location" value={`#${order.location_number}`} />
        ) : null}
        {cashier?.name ? <ReceiptLine label="Cashier" value={cashier.name} /> : null}
        {customer?.name ? <ReceiptLine label="Customer" value={customer.name} /> : null}
        {order.is_custom ? <ReceiptLine label="Sale type" value="Custom" /> : null}
      </div>

      <div className="border-b border-dashed border-slate-300 px-6 py-4">
        <div className="mb-3 flex justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Item</span>
          <span>Amount</span>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.quantity} × <Currency value={item.unit_price} />
                    {item.sku ? ` · ${item.sku}` : ""}
                  </p>
                  {Number(item.discount_amount || 0) > 0 ? (
                    <p className="text-xs text-slate-500">
                      Discount −<Currency value={item.discount_amount} />
                    </p>
                  ) : null}
                  {Number(item.refunded_qty || 0) > 0 ? (
                    <p className="text-xs text-rose-600">
                      Refunded qty {item.refunded_qty}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 font-medium text-slate-900">
                  <Currency value={item.line_total || item.subtotal || item.after_discount} />
                </p>
              </div>
            </div>
          ))}
          {!items.length ? (
            <p className="text-sm text-slate-500">No line items on this order.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 border-b border-dashed border-slate-300 px-6 py-4">
        <ReceiptLine label="Subtotal" value={<Currency value={order.subtotal} />} />
        {Number(order.discount_amount || 0) > 0 ? (
          <ReceiptLine
            label="Order discount"
            value={
              <>
                −<Currency value={order.discount_amount} />
              </>
            }
          />
        ) : null}
        {Number(order.coupon_discount_amount || 0) > 0 ? (
          <ReceiptLine
            label={order.coupon_code ? `Coupon (${order.coupon_code})` : "Coupon"}
            value={
              <>
                −<Currency value={order.coupon_discount_amount} />
              </>
            }
          />
        ) : null}
        <ReceiptLine label="Tax" value={<Currency value={order.tax_amount} />} />
        {Number(order.shipping_fee || 0) > 0 ? (
          <ReceiptLine label="Shipping" value={<Currency value={order.shipping_fee} />} />
        ) : null}
        <div className="border-t border-slate-300 pt-2">
          <ReceiptLine label="Total" value={<Currency value={order.total_amount} />} strong />
        </div>
        <ReceiptLine
          label="Amount paid"
          value={<Currency value={paid || order.amount_paid || 0} />}
        />
        {order.change_due != null ? (
          <ReceiptLine label="Change due" value={<Currency value={order.change_due} />} />
        ) : null}
      </div>

      {payments.length ? (
        <div className="space-y-2 border-b border-dashed border-slate-300 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Payments
          </p>
          {payments.map((payment) => (
            <ReceiptLine
              key={payment.id}
              label={`${payment.method || "payment"} · ${payment.status || ""}`}
              value={<Currency value={payment.amount} />}
            />
          ))}
        </div>
      ) : null}

      {(order.void_reason || order.cancel_reason) ? (
        <div className="border-b border-dashed border-slate-300 px-6 py-4 text-sm text-slate-500">
          {order.void_reason ? <p>Void reason: {order.void_reason}</p> : null}
          {order.cancel_reason ? <p>Cancel reason: {order.cancel_reason}</p> : null}
        </div>
      ) : null}

      <div className="px-6 py-5 text-center text-xs text-slate-500">
        <p>Thank you for your purchase</p>
        <p className="mt-1">Keep this receipt for your records</p>
      </div>
    </article>
  )
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { store } = useAuth()
  const { toast, confirmToast } = useToast()
  const [reason, setReason] = useState("")
  const [refundQty, setRefundQty] = useState({})

  const orderQuery = useOrderQuery(id)
  const receiptQuery = useOrderReceiptQuery(id, { enabled: true })
  const voidOrder = useVoidOrder()
  const cancelOrder = useCancelOrder()
  const refundItem = useRefundOrderItem()
  const refundFull = useRefundEntireOrder()

  const view = orderQuery.data
  const order = view?.order
  const items = view?.items || []
  const payments = view?.payments || []
  const customer = view?.customer || order?.customer || null
  const cashier = order?.cashier || null
  const receipt =
    receiptQuery.data?.receipt ||
    (receiptQuery.data && !receiptQuery.data.order ? receiptQuery.data : null)

  const canAct = order && ["completed", "pending"].includes(order.order_status)
  const canRefund = order && ["completed", "refunded"].includes(order.order_status)
  const backTo = useMemo(() => {
    if (!order) return "/orders"
    if (order.order_status === "cancelled" || order.order_status === "voided") {
      return "/orders/cancelled"
    }
    if (order.is_custom) return "/orders/custom"
    return "/orders"
  }, [order])

  async function runVoid() {
    if (!order || !reason.trim()) {
      toast("Reason is required", "error")
      return
    }
    const ok = await confirmToast({
      title: "Void order?",
      message: "This can restock items and reverse credit where applicable.",
      confirmLabel: "Void order",
    })
    if (!ok) return
    try {
      await voidOrder.mutateAsync({ id: order.id, body: { reason: reason.trim() } })
      toast("Order voided")
      navigate("/orders/cancelled")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function runCancel() {
    if (!order || !reason.trim()) {
      toast("Reason is required", "error")
      return
    }
    const ok = await confirmToast({
      title: "Cancel order?",
      message: "The order will move to cancelled history.",
      confirmLabel: "Cancel order",
    })
    if (!ok) return
    try {
      await cancelOrder.mutateAsync({ id: order.id, body: { reason: reason.trim() } })
      toast("Order cancelled")
      navigate("/orders/cancelled")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function runFullRefund() {
    if (!order || !reason.trim()) {
      toast("Reason is required", "error")
      return
    }
    const ok = await confirmToast({
      title: "Refund entire order?",
      message: "All remaining refundable items will be refunded.",
      confirmLabel: "Refund order",
    })
    if (!ok) return
    try {
      await refundFull.mutateAsync({ id: order.id, body: { reason: reason.trim() } })
      toast("Order refund created")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function runItemRefund(item) {
    if (!order || !reason.trim()) {
      toast("Reason is required", "error")
      return
    }
    const qty = Number(refundQty[item.id] || 0)
    if (!qty || qty <= 0) {
      toast("Refund quantity is required", "error")
      return
    }
    try {
      await refundItem.mutateAsync({
        id: order.id,
        body: {
          order_item_id: item.id,
          quantity: qty,
          reason: reason.trim(),
        },
      })
      toast("Partial refund created")
      setRefundQty({ ...refundQty, [item.id]: "" })
    } catch (err) {
      toast(err.message, "error")
    }
  }

  if (orderQuery.isPending) return <PageLoader label="Loading order…" />
  if (orderQuery.error) {
    return (
      <section className="space-y-4">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
        <p className="text-sm text-rose-700">{orderQuery.error.message}</p>
      </section>
    )
  }
  if (!order) {
    return (
      <section className="space-y-4">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
        <p className="text-sm text-slate-500">Order not found.</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Order #{order.order_number}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={order.channel} />
            <StatusBadge value={order.order_status} />
            <StatusBadge value={order.payment_status} />
            {order.is_custom ? <Pill tone="amber">Custom</Pill> : null}
          </div>
        </div>
        <Button variant="ghost" type="button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="print:mx-auto">
          <OrderReceipt
            storeName={store?.name}
            order={order}
            items={items}
            payments={payments}
            receipt={receipt}
            customer={customer}
            cashier={cashier}
          />
          {receiptQuery.isPending ? (
            <p className="mt-3 text-center text-xs text-slate-500">Loading receipt number…</p>
          ) : null}
          {receiptQuery.error && !receipt ? (
            <p className="mt-3 text-center text-xs text-slate-500">
              Showing order layout. Official receipt record was not found.
            </p>
          ) : null}
        </div>

        <div className="space-y-5 print:hidden">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Line actions
            </h2>
            <div className="mt-4 grid gap-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-500">
                        Qty {item.quantity} · Remaining {item.remaining_qty ?? item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900">
                      <Currency value={item.line_total || item.subtotal} />
                    </p>
                  </div>
                  {canRefund && Number(item.remaining_qty || 0) > 0 ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-[180px_auto]">
                      <Input
                        label="Partial refund qty"
                        type="number"
                        min="0.01"
                        max={item.remaining_qty}
                        step="0.01"
                        value={refundQty[item.id] || ""}
                        onChange={(event) =>
                          setRefundQty({ ...refundQty, [item.id]: event.target.value })
                        }
                      />
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          onClick={() => runItemRefund(item)}
                          disabled={refundItem.isPending}
                        >
                          Refund item
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Order actions
            </h2>
            <div className="mt-4 space-y-4">
              <Input
                label="Action reason"
                placeholder="Required for void, cancel, and refunds"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {canAct ? (
                  <Button variant="danger" onClick={runVoid} disabled={voidOrder.isPending}>
                    Void
                  </Button>
                ) : null}
                {canAct ? (
                  <Button variant="danger" onClick={runCancel} disabled={cancelOrder.isPending}>
                    Cancel
                  </Button>
                ) : null}
                {canRefund ? (
                  <Button onClick={runFullRefund} disabled={refundFull.isPending}>
                    Refund remaining order
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
