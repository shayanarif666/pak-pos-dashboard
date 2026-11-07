import { useMemo, useRef, useState } from "react"
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
import { OrderReceipt } from "../../features/orders/OrderReceipt.jsx"
import {
  discountSummary,
  itemPrice,
  itemQtyText,
  methodLabel,
  num,
  paymentRows,
  rateText,
  TAX_LEVEL_LABEL,
  taxSummary,
} from "../../features/orders/orderView.js"
import { useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { StatCards } from "../../ui/PageHeader.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, StatusBadge } from "../../ui/Pill.jsx"
import { formatDate, formatDateTime } from "../../ui/format.js"
import { unitShort } from "../../ui/units.js"

const money = (value) => <Currency value={value} />

function Panel({ title, description, actions = null, children, flush = false }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className={flush ? "mt-4" : "mt-4 px-5 pb-5"}>{children}</div>
    </section>
  )
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">{children ?? "—"}</dd>
    </div>
  )
}

function Line({ label, value, strong = false, tone = "" }) {
  return (
    <div className={`flex justify-between gap-4 py-1 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className="text-slate-500">{label}</span>
      <span className={`text-right tabular-nums ${tone || "text-slate-900"}`}>{value}</span>
    </div>
  )
}

/** One sold line: what, how much, its discount, every tax, its lots and what came back. */
function ItemRow({ item }) {
  const price = itemPrice(item)
  const profit = num(item.after_discount) - num(item.cost_price) * num(item.quantity)
  return (
    <div className="border-t border-slate-100 px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-950">{item.title}</p>
            {item.is_custom_line ? <Pill tone="amber">Custom</Pill> : null}
            {item.sale_unit === "pack" ? <Pill tone="sky">Pack</Pill> : null}
            {item.is_weight_based ? <Pill tone="violet">By weight</Pill> : null}
            {num(item.free_qty) > 0 ? <Pill tone="emerald">+{num(item.free_qty)} free</Pill> : null}
            {num(item.refunded_qty) > 0 ? <Pill tone="rose">Refunded {num(item.refunded_qty)}</Pill> : null}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {[item.category_name, item.sku, item.barcode].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold tabular-nums text-slate-950">{money(item.line_total)}</p>
          <p className="text-xs text-slate-500">line total</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Quantity</p>
          <p className="font-medium text-slate-900">{itemQtyText(item)}</p>
          {item.sale_unit === "pack" ? <p className="text-xs text-slate-500">= {num(item.quantity)} {unitShort(item.unit)}</p> : null}
        </div>
        <div>
          <p className="text-xs text-slate-500">Price</p>
          <p className="font-medium text-slate-900"><Currency value={price.value} /> / {price.per}</p>
          <p className="text-xs text-slate-500">Gross <Currency value={item.list_amount} /></p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Discount</p>
          {num(item.discount_amount) > 0 ? (
            <>
              <p className="font-medium text-rose-700">−<Currency value={item.discount_amount} /></p>
              <p className="text-xs text-slate-500">
                {(item.discounts || []).map((d) => `${d.name}${d.discount_type === "percentage" ? ` ${num(d.discount_value)}%` : ""}`).join(", ") || "Item discount"}
              </p>
            </>
          ) : (
            <p className="font-medium text-slate-400">None</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500">After discount</p>
          <p className="font-medium text-slate-900"><Currency value={item.after_discount} /></p>
          <p className="text-xs text-slate-500">
            Cost <Currency value={num(item.cost_price) * num(item.quantity)} /> · profit <Currency value={profit} />
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Taxes · <Currency value={item.tax_amount} /></p>
          {(item.taxes || []).length ? (
            <div className="flex flex-wrap gap-1.5">
              {item.taxes.map((tax, index) => (
                <span key={`${tax.name}-${index}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                  {tax.name} {rateText(tax)} · <Currency value={tax.amount} />
                  <span className="ml-1 text-slate-400">({TAX_LEVEL_LABEL[tax.level] || "Tax"})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No tax</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Sold from lots</p>
          {(item.lots || []).length ? (
            <div className="flex flex-wrap gap-1.5">
              {item.lots.map((lot) => (
                <span key={lot.id} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                  Lot {lot.id} · {num(lot.qty)} {unitShort(item.unit)}
                  {lot.expiry_date ? ` · exp ${formatDate(lot.expiry_date)}` : ""}
                  {num(lot.returned) > 0 ? <span className="text-rose-600"> · {num(lot.returned)} back</span> : null}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">{item.is_custom_line ? "Custom line — no stock" : "—"}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Opens the receipt alone in a print window (with the page's styles). */
function printNode(node, title) {
  if (!node) return
  const win = window.open("", "_blank", "width=420,height=720")
  if (!win) return window.print()
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((el) => el.outerHTML).join("")
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}<style>body{background:#fff;margin:0}@page{margin:8mm}</style></head><body>${node.outerHTML}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { store } = useAuth()
  const { toast, confirmToast } = useToast()
  const locationName = useLocationName()
  const receiptRef = useRef(null)
  const [reason, setReason] = useState("")
  const [refundQty, setRefundQty] = useState({})
  const [showInvoice, setShowInvoice] = useState(false)

  const orderQuery = useOrderQuery(id)
  const receiptQuery = useOrderReceiptQuery(id, { enabled: true })
  const voidOrder = useVoidOrder()
  const cancelOrder = useCancelOrder()
  const refundItem = useRefundOrderItem()
  const refundFull = useRefundEntireOrder()

  const view = orderQuery.data
  const order = view?.order
  const items = useMemo(() => view?.items || [], [view])
  const payments = useMemo(() => view?.payments || [], [view])
  const customer = view?.customer || order?.customer || null
  const cashier = order?.cashier || null
  const receipt = receiptQuery.data?.receipt || (receiptQuery.data && !receiptQuery.data.order ? receiptQuery.data : null)

  // This order's refunds (the refunds list of its location, narrowed to the order).
  const refundsQuery = useRefundsQuery(order ? { location_id: order.location_id } : {})
  const refunds = useMemo(() => (refundsQuery.data || []).filter((row) => order && row.order_id === order.id), [refundsQuery.data, order])

  const canAct = order && ["completed", "pending"].includes(order.order_status)
  const canRefund = order && ["completed", "partial_refunded"].includes(order.order_status)

  async function withReason(run, confirm) {
    if (!order || !reason.trim()) return toast("Reason is required", "error")
    if (confirm && !(await confirmToast(confirm))) return
    try {
      await run()
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const runVoid = () =>
    withReason(async () => {
      await voidOrder.mutateAsync({ id: order.id, body: { reason: reason.trim() } })
      toast("Order voided")
      navigate("/orders?tab=cancelled")
    }, { title: "Void order?", message: "This can restock items and reverse credit where applicable.", confirmLabel: "Void order" })

  const runCancel = () =>
    withReason(async () => {
      await cancelOrder.mutateAsync({ id: order.id, body: { reason: reason.trim() } })
      toast("Order cancelled")
      navigate("/orders?tab=cancelled")
    }, { title: "Cancel order?", message: "The order will move to cancelled history.", confirmLabel: "Cancel order" })

  const runFullRefund = () =>
    withReason(async () => {
      await refundFull.mutateAsync({ id: order.id, body: { reason: reason.trim() } })
      toast("Order refund created")
    }, { title: "Refund entire order?", message: "All remaining refundable items will be refunded.", confirmLabel: "Refund order" })

  const runItemRefund = (item) =>
    withReason(async () => {
      const qty = Number(refundQty[item.id] || 0)
      if (!qty || qty <= 0) return toast("Refund quantity is required", "error")
      await refundItem.mutateAsync({ id: order.id, body: { order_item_id: item.id, quantity: qty, reason: reason.trim() } })
      toast("Partial refund created")
      setRefundQty({ ...refundQty, [item.id]: "" })
    })

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

  const taxes = taxSummary(items)
  const discounts = discountSummary(items)
  const pays = paymentRows(order, payments)
  const surcharge = pays.reduce((sum, row) => sum + row.surcharge, 0)
  const handed = pays.reduce((sum, row) => sum + row.paid, 0) || num(order.amount_paid)
  const change = pays.reduce((sum, row) => sum + row.change, 0) || num(order.change_due)
  const collected = pays.filter((row) => row.status === "success").reduce((sum, row) => sum + row.amount, 0)
  const remaining = Math.max(0, num(order.total_amount) - collected)
  const refundedTotal = refunds.reduce((sum, row) => sum + num(row.amount), 0)
  const discountTotal = num(order.line_discount_amount) + num(order.discount_amount) + num(order.coupon_discount_amount)
  const netSales = num(order.subtotal) - num(order.discount_amount) - num(order.coupon_discount_amount)
  const profit = netSales - num(order.cost_total)
  const refundable = canRefund ? items.filter((item) => num(item.remaining_qty) > 0) : []
  const location = locationName(order.location_id)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {backLink}
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Order #{order.order_number}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDateTime(order.placed_at)} · {location} · {cashier?.name || "—"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={order.channel} />
            <StatusBadge value={order.order_status} />
            <StatusBadge label="Payment" value={order.payment_status} />
            <Pill tone="zinc">{methodLabel(order.payment_method)}</Pill>
            {order.is_custom ? <Pill tone="amber">Custom sale</Pill> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => document.getElementById("order-payments")?.scrollIntoView({ behavior: "smooth" })}>
            <CreditCard className="h-4 w-4" />
            Payments
          </Button>
          <Button onClick={() => setShowInvoice(true)}>
            <FileText className="h-4 w-4" />
            View Receipt
          </Button>
        </div>
      </div>

      <StatCards
        items={[
          { label: "Total", value: money(order.total_amount), hint: <>{items.length} item{items.length === 1 ? "" : "s"} · tax <Currency value={order.tax_amount} /></> },
          { label: "Paid", value: money(handed), hint: change > 0 ? <>Change <Currency value={change} /></> : remaining > 0.009 ? <>Udhaar <Currency value={remaining} /></> : "Fully paid" },
          { label: "Discounts", value: money(discountTotal), hint: discounts.map((d) => d.name).join(", ") || "None" },
          { label: "Profit", value: money(profit), hint: refundedTotal > 0 ? <>Refunded <Currency value={refundedTotal} /></> : <>Cost <Currency value={order.cost_total} /></> },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="min-w-0 space-y-6">
          <Panel title="Order information">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Order #">#{order.order_number}</Detail>
              <Detail label="Receipt #">{receipt?.receipt_number != null ? `#${receipt.receipt_number}` : "—"}</Detail>
              <Detail label="POS receipt #">{order.local_receipt_number}</Detail>
              <Detail label="Placed at">{formatDateTime(order.placed_at)}</Detail>
              <Detail label="Synced at">{order.synced_at ? formatDateTime(order.synced_at) : "—"}</Detail>
              <Detail label="Channel">{(order.channel || "—").toUpperCase()}</Detail>
              <Detail label="Location">{location}</Detail>
              <Detail label="Batch">{order.batch ? <>#{order.batch.id} <span className="text-xs font-normal capitalize text-slate-500">({order.batch.status})</span></> : "—"}</Detail>
              <Detail label="Cashier">{cashier ? <>{cashier.name} <span className="text-xs font-normal capitalize text-slate-500">({String(cashier.role || "").replace("_", " ")})</span></> : "—"}</Detail>
              <Detail label="Customer">
                {customer ? (
                  <>
                    {customer.name}
                    <span className="block text-xs font-normal text-slate-500">{[customer.phone, customer.email].filter(Boolean).join(" · ")}</span>
                  </>
                ) : (
                  "Walk-in"
                )}
              </Detail>
              <Detail label="Sale type">{order.is_custom ? "Custom sale" : items.some((i) => i.is_custom_line) ? "Catalog + custom lines" : "Catalog"}</Detail>
              <Detail label="Payment">{methodLabel(order.payment_method)} · <span className="capitalize">{order.payment_status}</span></Detail>
              {order.client_local_id ? <Detail label="POS order id">{order.client_local_id}</Detail> : null}
              {order.void_reason ? <Detail label="Void reason">{order.void_reason}</Detail> : null}
              {order.cancel_reason ? <Detail label="Cancel reason">{order.cancel_reason}</Detail> : null}
            </dl>
          </Panel>

          <Panel title={`Items (${items.length})`} description="Each line as sold: quantity, price, discount, every tax and the stock lots it came from." flush>
            <div className="border-t border-slate-200">
              {items.map((item) => <ItemRow key={item.id} item={item} />)}
              {!items.length ? <p className="px-5 py-6 text-center text-sm text-slate-500">No line items on this order.</p> : null}
            </div>
          </Panel>

          <div id="order-payments">
            <Panel title={`Payments (${pays.length})`} description="Each method's share of the bill, its surcharge, what was handed over and the change.">
              <div className="-mx-5 overflow-x-auto">
                <table className="ui-table w-full min-w-[640px] text-left text-sm">
                  <thead className="border-y border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold">Method</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Bill share</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Surcharge</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Change</th>
                      <th className="px-5 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pays.map((row, index) => (
                      <tr key={index} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-950">{methodLabel(row.method)}</p>
                          <p className="text-xs text-slate-500">
                            {row.transaction_number != null ? `Txn #${row.transaction_number}` : ""}
                            {row.paid_at ? ` · ${formatDateTime(row.paid_at)}` : ""}
                            {row.reference ? ` · ${row.reference}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{money(row.bill_share)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {row.surcharge > 0 ? (
                            <>
                              {money(row.surcharge)}
                              <span className="block text-xs text-slate-500">{row.surcharge_type === "percentage" ? `${num(row.surcharge_value)}%` : row.surcharge_type === "fixed" ? "fixed" : ""}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(row.amount)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{money(row.paid)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.change > 0 ? money(row.change) : "—"}</td>
                        <td className="px-5 py-3"><StatusBadge value={row.status} /></td>
                      </tr>
                    ))}
                    {!pays.length ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-6 text-center text-slate-500">No payments recorded (udhaar or pending).</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <Panel title={`Refunds (${refunds.length})`}>
            {refunds.length ? (
              <div className="-mx-5 overflow-x-auto">
                <table className="ui-table w-full min-w-[640px] text-left text-sm">
                  <thead className="border-y border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold">Refund #</th>
                      <th className="px-3 py-2.5 font-semibold">Date</th>
                      <th className="px-3 py-2.5 font-semibold">Type</th>
                      <th className="px-3 py-2.5 font-semibold">Items</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Tax</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Refunded</th>
                      <th className="px-5 py-2.5 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-3 font-semibold">#{row.refund_number ?? "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{formatDateTime(row.created_at)}</td>
                        <td className="px-3 py-3"><StatusBadge value={row.refund_type || "partial"} /></td>
                        <td className="max-w-56 px-3 py-3 text-slate-700">
                          {(row.items || []).length
                            ? row.items.map((i) => `${i.title || i.item_title} × ${num(i.quantity)}`).join(", ")
                            : `${row.item_title || "—"}${row.quantity != null ? ` × ${row.quantity}` : ""}`}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{money(row.tax_amount)}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(row.amount)}</td>
                        <td className="px-5 py-3 text-slate-700">{row.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nothing refunded on this order.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Bill summary">
            <Line label={`Gross (${items.length} item${items.length === 1 ? "" : "s"})`} value={money(order.gross_amount)} />
            {discounts.map((row) => (
              <Line key={`${row.id}-${row.name}`} label={row.name} value={<>−{money(row.amount)}</>} tone="text-rose-700" />
            ))}
            {num(order.discount_amount) > 0 ? (
              <Line label={`Order discount${order.order_discount_type ? ` (${order.order_discount_type})` : ""}`} value={<>−{money(order.discount_amount)}</>} tone="text-rose-700" />
            ) : null}
            {num(order.coupon_discount_amount) > 0 ? (
              <Line label={order.coupon_code ? `Coupon (${order.coupon_code})` : "Coupon"} value={<>−{money(order.coupon_discount_amount)}</>} tone="text-rose-700" />
            ) : null}
            <div className="mt-1 border-t border-slate-100 pt-1">
              <Line label="Subtotal (after discounts)" value={money(netSales)} strong />
            </div>
            {taxes.map((tax) => (
              <Line
                key={`${tax.level}-${tax.name}-${tax.rate}`}
                label={<>{tax.name} {rateText(tax)} <span className="text-xs text-slate-400">· {TAX_LEVEL_LABEL[tax.level] || "Tax"}</span></>}
                value={money(tax.amount)}
              />
            ))}
            {taxes.length ? <Line label="Total tax" value={money(order.tax_amount)} /> : <Line label="Tax" value="None" />}
            {surcharge > 0 ? <Line label="Payment surcharges" value={money(surcharge)} /> : null}
            {num(order.shipping_fee) > 0 ? <Line label="Shipping" value={money(order.shipping_fee)} /> : null}
            {num(order.fbr_tax_amount) > 0 ? <Line label="FBR fee" value={money(order.fbr_tax_amount)} /> : null}
            <div className="mt-2 border-t border-slate-200 pt-2">
              <Line label="Total" value={money(order.total_amount)} strong />
            </div>
            <Line label="Paid" value={money(handed)} />
            {change > 0 ? <Line label="Change given" value={money(change)} /> : null}
            {remaining > 0.009 ? <Line label="Remaining (udhaar)" value={money(remaining)} tone="text-amber-700" /> : null}
            {refundedTotal > 0 ? <Line label="Refunded" value={<>−{money(refundedTotal)}</>} tone="text-rose-700" /> : null}
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Line label="Cost of goods" value={money(order.cost_total)} />
              <Line label="Profit (before tax)" value={money(profit)} tone={profit < 0 ? "text-rose-700" : "text-emerald-700"} />
            </div>
          </Panel>

          {canAct || canRefund ? (
            <Panel title="Actions" description="Void / cancel the sale, or refund some or all of it.">
              <div className="space-y-4">
                <Input label="Reason" placeholder="Required for void, cancel and refunds" value={reason} onChange={(event) => setReason(event.target.value)} />
                {refundable.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Refund some items</p>
                    {refundable.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 pl-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-950">{item.title}</p>
                          <p className="text-xs text-slate-500">{num(item.remaining_qty)} of {num(item.quantity)} {unitShort(item.unit)} left</p>
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
                  {canRefund ? <Button onClick={runFullRefund} disabled={refundFull.isPending}>Refund remaining order</Button> : null}
                  {canAct ? <Button variant="danger" onClick={runVoid} disabled={voidOrder.isPending}>Void</Button> : null}
                  {canAct ? <Button variant="danger" onClick={runCancel} disabled={cancelOrder.isPending}>Cancel</Button> : null}
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <Modal open={showInvoice} onClose={() => setShowInvoice(false)} size="md">
        <ModalCard title={`Receipt · Order #${order.order_number}`} onClose={() => setShowInvoice(false)}>
          <div className="mb-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => printNode(receiptRef.current, `Receipt ${order.order_number}`)}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <OrderReceipt
              ref={receiptRef}
              storeName={store?.name}
              order={order}
              items={items}
              payments={payments}
              receipt={receipt}
              customer={customer}
              cashier={cashier}
              locationName={location}
            />
          </div>
        </ModalCard>
      </Modal>
    </section>
  )
}
