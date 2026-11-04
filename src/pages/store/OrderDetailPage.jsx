import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CreditCard, FileText, Printer } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { Currency } from "../../ui/Currency.jsx"
import {
  useCancelOrder,
  useOrderQuery,
  useOrderReceiptQuery,
  useRefundEntireOrder,
  useRefundOrderItem,
  useRefundsQuery,
  useVoidOrder,
} from "../../features/orders/orderQuery.js"
import { useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { StatCards } from "../../ui/PageHeader.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, StatusBadge } from "../../ui/Pill.jsx"

function formatDateTime(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

const money = (value) => <Currency value={value} />
const hasAmount = (value) => Number(value || 0) > 0

function ReceiptLine({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{value}</span>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{children ?? "—"}</dd>
    </div>
  )
}

/** The printed invoice: what the customer's receipt shows. */
function OrderReceipt({ storeName, order, items, payments, receipt, customer, cashier, locationName }) {
  const receiptNumber = receipt?.receipt_number
  const issuedAt = receipt?.issued_at || order.placed_at
  // What the customer handed over (cash may be more than the bill); the payment rows only cover the bill.
  const paid = Number(order.amount_paid) || payments.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  return (
    <article className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900">
      <div className="border-b border-dashed border-slate-300 px-6 py-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Invoice</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{storeName || "Store"}</h2>
        <p className="mt-2 text-sm text-slate-500">
          Order #{order.order_number}
          {receiptNumber != null ? ` · Receipt #${receiptNumber}` : ""}
        </p>
        <p className="mt-1 text-xs text-slate-500">{formatDateTime(issuedAt)}</p>
      </div>

      <div className="space-y-2 border-b border-dashed border-slate-300 px-6 py-4 text-sm">
        <ReceiptLine label="Location" value={locationName} />
        {cashier?.name ? <ReceiptLine label="Cashier" value={cashier.name} /> : null}
        {customer?.name ? <ReceiptLine label="Customer" value={customer.name} /> : null}
        <ReceiptLine label="Payment" value={<span className="capitalize">{order.payment_method || "—"} · {order.payment_status || "—"}</span>} />
      </div>

      <div className="border-b border-dashed border-slate-300 px-6 py-4">
        <div className="mb-3 flex justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Item</span>
          <span>Amount</span>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.quantity} × <Currency value={item.unit_price} />
                  {item.sku ? ` · ${item.sku}` : ""}
                </p>
                {hasAmount(item.discount_amount) ? (
                  <p className="text-xs text-slate-500">Discount −<Currency value={item.discount_amount} /></p>
                ) : null}
                {hasAmount(item.refunded_qty) ? <p className="text-xs text-rose-600">Refunded qty {item.refunded_qty}</p> : null}
              </div>
              <p className="shrink-0 font-medium text-slate-900">
                <Currency value={item.line_total || item.subtotal || item.after_discount} />
              </p>
            </div>
          ))}
          {!items.length ? <p className="text-sm text-slate-500">No line items on this order.</p> : null}
        </div>
      </div>

      <div className="space-y-2 border-b border-dashed border-slate-300 px-6 py-4">
        <ReceiptLine label="Subtotal" value={money(order.subtotal)} />
        {hasAmount(order.discount_amount) ? <ReceiptLine label="Order discount" value={<>−{money(order.discount_amount)}</>} /> : null}
        {hasAmount(order.coupon_discount_amount) ? (
          <ReceiptLine label={order.coupon_code ? `Coupon (${order.coupon_code})` : "Coupon"} value={<>−{money(order.coupon_discount_amount)}</>} />
        ) : null}
        <ReceiptLine label="Tax" value={money(order.tax_amount)} />
        {hasAmount(order.shipping_fee) ? <ReceiptLine label="Shipping" value={money(order.shipping_fee)} /> : null}
        <div className="border-t border-slate-300 pt-2">
          <ReceiptLine label="Total" value={money(order.total_amount)} strong />
        </div>
        <ReceiptLine label="Amount paid" value={money(paid)} />
        {order.change_due != null ? <ReceiptLine label="Change due" value={money(order.change_due)} /> : null}
      </div>

      {payments.length ? (
        <div className="space-y-2 border-b border-dashed border-slate-300 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payments</p>
          {payments.map((payment) => (
            <ReceiptLine key={payment.id} label={<span className="capitalize">{payment.method || "payment"}</span>} value={money(payment.amount)} />
          ))}
        </div>
      ) : null}

      <div className="px-6 py-5 text-center text-xs text-slate-500">
        <p>Thank you for your purchase</p>
      </div>
    </article>
  )
}

function SimpleTable({ head, children, empty, colSpan }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="ui-table w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            {head.map(([label, align]) => (
              <th key={label} className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : ""}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
          {empty ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-6 text-center text-slate-500">{empty}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

/** Every payment of the order (its transactions) and every refund paid back. */
function TransactionsModal({ open, onClose, order, payments, refunds }) {
  return (
    <Modal open={open} onClose={onClose} size="xl">
      <ModalCard title={`Transactions · Order #${order.order_number}`} onClose={onClose}>
        <SimpleTable
          head={[["Date"], ["Method"], ["Amount", "right"], ["Payment GST", "right"], ["Reference"], ["Status"]]}
          empty={payments.length ? null : "No payments recorded (udhaar or pending)."}
          colSpan={6}
        >
          {payments.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-700">{formatDateTime(row.paid_at || row.created_at)}</td>
              <td className="px-4 py-3"><StatusBadge value={row.method} /></td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(row.amount)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{money(row.tax_amount)}</td>
              <td className="px-4 py-3 text-slate-700">{row.reference || "—"}</td>
              <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
            </tr>
          ))}
        </SimpleTable>

        <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-950">Refunds</h3>
        <SimpleTable
          head={[["Refund #"], ["Date"], ["Type"], ["Items"], ["Tax", "right"], ["Refunded", "right"], ["Reason"]]}
          empty={refunds.length ? null : "Nothing refunded on this order."}
          colSpan={7}
        >
          {refunds.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold">#{row.refund_number ?? "—"}</td>
              <td className="px-4 py-3 text-slate-700">{formatDateTime(row.created_at)}</td>
              <td className="px-4 py-3"><StatusBadge value={row.refund_type || "partial"} /></td>
              <td className="max-w-48 truncate px-4 py-3 text-slate-700">
                {row.item_title || "—"}
                {row.quantity != null ? ` × ${row.quantity}` : ""}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{money(row.tax_amount)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(row.amount)}</td>
              <td className="px-4 py-3 text-slate-700">{row.reason || "—"}</td>
            </tr>
          ))}
        </SimpleTable>
      </ModalCard>
    </Modal>
  )
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { store } = useAuth()
  const { toast, confirmToast } = useToast()
  const locationName = useLocationName()
  const [reason, setReason] = useState("")
  const [refundQty, setRefundQty] = useState({})
  const [showInvoice, setShowInvoice] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false)

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

  // This order's refunds (the refunds list of its location, narrowed to the order).
  const refundsQuery = useRefundsQuery(order ? { location_id: order.location_id } : {})
  const refunds = useMemo(
    () => (refundsQuery.data || []).filter((row) => order && row.order_id === order.id),
    [refundsQuery.data, order]
  )

  const canAct = order && ["completed", "pending"].includes(order.order_status)
  const canRefund = order && ["completed", "partial_refunded"].includes(order.order_status)

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
      navigate("/orders?tab=cancelled")
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
      navigate("/orders?tab=cancelled")
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
        body: { order_item_id: item.id, quantity: qty, reason: reason.trim() },
      })
      toast("Partial refund created")
      setRefundQty({ ...refundQty, [item.id]: "" })
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const backLink = (
    <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700">
      <ArrowLeft className="h-4 w-4" />
      Back to orders
    </Link>
  )

  if (orderQuery.isPending) return <PageLoader label="Loading order…" />
  if (orderQuery.error || !order) {
    return (
      <section className="space-y-4">
        {backLink}
        <p className="text-sm text-rose-700">{orderQuery.error?.message || "Order not found."}</p>
      </section>
    )
  }

  const paidTotal = payments
    .filter((row) => row.status === "success")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const remaining = Math.max(0, Number(order.total_amount || 0) - paidTotal)
  const refundedTotal = refunds.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const discountTotal =
    Number(order.line_discount_amount || 0) + Number(order.discount_amount || 0) + Number(order.coupon_discount_amount || 0)
  const refundable = canRefund ? items.filter((item) => Number(item.remaining_qty || 0) > 0) : []

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {backLink}
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Order #{order.order_number}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={order.channel} />
            <StatusBadge value={order.order_status} />
            <StatusBadge value={order.payment_status} />
            {order.is_custom ? <Pill tone="amber">Custom</Pill> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setShowTransactions(true)}>
            <CreditCard className="h-4 w-4" />
            View Transactions
          </Button>
          <Button onClick={() => setShowInvoice(true)}>
            <FileText className="h-4 w-4" />
            View Invoice
          </Button>
        </div>
      </div>

      <StatCards
        items={[
          { label: "Total", value: money(order.total_amount), hint: `${items.length} line${items.length === 1 ? "" : "s"}` },
          {
            label: "Paid",
            value: money(paidTotal),
            hint: hasAmount(order.change_due) ? <>Handed over <Currency value={order.amount_paid} /> · change <Currency value={order.change_due} /></> : null,
          },
          remaining > 0.009
            ? { label: "Remaining (udhaar)", value: money(remaining) }
            : { label: "Discounts", value: money(discountTotal) },
          { label: "Refunded", value: money(refundedTotal), hint: `${refunds.length} refund${refunds.length === 1 ? "" : "s"}` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="min-w-0 space-y-6">
          <Panel title="Order details">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Placed at">{formatDateTime(order.placed_at)}</Detail>
              <Detail label="Receipt #">{receipt?.receipt_number ?? "—"}</Detail>
              <Detail label="Channel">{(order.channel || "—").toUpperCase()}</Detail>
              <Detail label="Location">{locationName(order.location_id)}</Detail>
              <Detail label="Cashier">{cashier?.name}</Detail>
              <Detail label="Customer">
                {customer ? `${customer.name}${customer.phone ? ` · ${customer.phone}` : ""}` : "Walk-in"}
              </Detail>
              <Detail label="Payment method"><span className="capitalize">{order.payment_method || "—"}</span></Detail>
              <Detail label="Sale type">{order.is_custom ? "Custom" : "Catalog"}</Detail>
              <Detail label="Order discount">
                {hasAmount(order.discount_amount)
                  ? <>{money(order.discount_amount)}{order.order_discount_type ? ` (${order.order_discount_type})` : ""}</>
                  : "—"}
              </Detail>
              {order.void_reason ? <Detail label="Void reason">{order.void_reason}</Detail> : null}
              {order.cancel_reason ? <Detail label="Cancel reason">{order.cancel_reason}</Detail> : null}
            </dl>
          </Panel>

          <Panel title="Items">
            <div className="-mx-5 overflow-x-auto">
              <table className="ui-table w-full min-w-[720px] text-left text-sm">
                <thead className="border-y border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Item</th>
                    <th className="px-3 py-3 text-right font-semibold">Qty</th>
                    <th className="px-3 py-3 text-right font-semibold">Unit price</th>
                    <th className="px-3 py-3 text-right font-semibold">Discount</th>
                    <th className="px-3 py-3 text-right font-semibold">Tax</th>
                    <th className="px-3 py-3 text-right font-semibold">Refunded</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-950">{item.title}</p>
                        <p className="text-xs text-slate-500">{[item.sku, item.barcode].filter(Boolean).join(" · ") || "—"}</p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(item.unit_price)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {hasAmount(item.discount_amount) ? <>−{money(item.discount_amount)}</> : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(item.tax_amount)}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${hasAmount(item.refunded_qty) ? "text-rose-600" : ""}`}>
                        {hasAmount(item.refunded_qty) ? item.refunded_qty : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">{money(item.line_total)}</td>
                    </tr>
                  ))}
                  {!items.length ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-slate-500">No line items on this order.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Totals">
            <div className="space-y-2">
              <ReceiptLine label="Gross (price × qty)" value={money(order.gross_amount)} />
              {hasAmount(order.line_discount_amount) ? <ReceiptLine label="Item discounts" value={<>−{money(order.line_discount_amount)}</>} /> : null}
              <ReceiptLine label="Subtotal" value={money(order.subtotal)} />
              {hasAmount(order.discount_amount) ? <ReceiptLine label="Order discount" value={<>−{money(order.discount_amount)}</>} /> : null}
              {hasAmount(order.coupon_discount_amount) ? (
                <ReceiptLine label={order.coupon_code ? `Coupon (${order.coupon_code})` : "Coupon"} value={<>−{money(order.coupon_discount_amount)}</>} />
              ) : null}
              {hasAmount(order.sales_tax_amount) ? (
                <ReceiptLine label={`Sales tax${order.sales_tax_rate != null ? ` (${order.sales_tax_rate}%)` : ""}`} value={money(order.sales_tax_amount)} />
              ) : null}
              {hasAmount(order.product_tax_amount) ? <ReceiptLine label="Product tax" value={money(order.product_tax_amount)} /> : null}
              {hasAmount(order.category_tax_amount) ? <ReceiptLine label="Category tax" value={money(order.category_tax_amount)} /> : null}
              {hasAmount(order.payment_gst_amount) ? <ReceiptLine label="Payment method GST" value={money(order.payment_gst_amount)} /> : null}
              {hasAmount(order.fbr_tax_amount) ? <ReceiptLine label="FBR fee" value={money(order.fbr_tax_amount)} /> : null}
              <ReceiptLine label="Total tax" value={money(order.tax_amount)} />
              {hasAmount(order.shipping_fee) ? <ReceiptLine label="Shipping" value={money(order.shipping_fee)} /> : null}
              <div className="border-t border-slate-200 pt-2">
                <ReceiptLine label="Total" value={money(order.total_amount)} strong />
              </div>
              <ReceiptLine label="Paid" value={money(paidTotal)} />
              {remaining > 0.009 ? <ReceiptLine label="Remaining (udhaar)" value={money(remaining)} /> : null}
              {hasAmount(refundedTotal) ? <ReceiptLine label="Refunded" value={<>−{money(refundedTotal)}</>} /> : null}
            </div>
          </Panel>

          {canAct || canRefund ? (
            <Panel title="Actions">
              <div className="space-y-4">
                <Input
                  label="Reason"
                  placeholder="Required for void, cancel and refunds"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                {refundable.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Refund some items</p>
                    {refundable.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 pl-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-950">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.remaining_qty} of {item.quantity} left</p>
                        </div>
                        <input
                          type="number"
                          min="0.01"
                          max={item.remaining_qty}
                          step="0.01"
                          placeholder="Qty"
                          aria-label={`Refund qty for ${item.title}`}
                          value={refundQty[item.id] || ""}
                          onChange={(event) => setRefundQty({ ...refundQty, [item.id]: event.target.value })}
                          className="w-20 rounded-xl border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-700"
                        />
                        <Button variant="ghost" className="px-3 py-1.5" onClick={() => runItemRefund(item)} disabled={refundItem.isPending}>
                          Refund
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {canRefund ? (
                    <Button onClick={runFullRefund} disabled={refundFull.isPending}>Refund remaining order</Button>
                  ) : null}
                  {canAct ? (
                    <Button variant="danger" onClick={runVoid} disabled={voidOrder.isPending}>Void</Button>
                  ) : null}
                  {canAct ? (
                    <Button variant="danger" onClick={runCancel} disabled={cancelOrder.isPending}>Cancel</Button>
                  ) : null}
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <Modal open={showInvoice} onClose={() => setShowInvoice(false)} size="md">
        <div>
          <div className="mb-3 flex justify-end gap-2 print:hidden">
            <Button variant="ghost" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="ghost" onClick={() => setShowInvoice(false)}>Close</Button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto rounded-[28px]">
            <OrderReceipt
              storeName={store?.name}
              order={order}
              items={items}
              payments={payments}
              receipt={receipt}
              customer={customer}
              cashier={cashier}
              locationName={locationName(order.location_id)}
            />
          </div>
        </div>
      </Modal>
      <TransactionsModal
        open={showTransactions}
        onClose={() => setShowTransactions(false)}
        order={order}
        payments={payments}
        refunds={refunds}
      />
    </section>
  )
}
