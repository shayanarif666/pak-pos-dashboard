import { forwardRef } from "react"
import { Currency } from "../../ui/Currency.jsx"
import { formatDate, formatDateTime } from "../../ui/format.js"
import { discountSummary, itemPrice, itemQtyText, methodLabel, num, paymentRows, rateText, TAX_LEVEL_LABEL, taxSummary } from "./orderView.js"

const money = (value) => <Currency value={value} />

function Line({ label, value, strong = false, muted = false }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-base font-bold text-slate-950" : muted ? "text-xs text-slate-500" : "text-sm"}`}>
      <span className={strong ? "" : "text-slate-600"}>{label}</span>
      <span className="text-right tabular-nums text-slate-900">{value}</span>
    </div>
  )
}

const Divider = () => <div className="my-3 border-t border-dashed border-slate-300" />

/** The customer's receipt: every line with its discount and taxes, the totals and each payment. */
export const OrderReceipt = forwardRef(function OrderReceipt({ storeName, order, items, payments, receipt, customer, cashier, locationName }, ref) {
  const taxes = taxSummary(items)
  const discounts = discountSummary(items)
  const pays = paymentRows(order, payments)
  const surcharge = pays.reduce((sum, row) => sum + num(row.surcharge), 0)
  const handed = pays.reduce((sum, row) => sum + num(row.paid), 0) || num(order.amount_paid)
  const change = pays.reduce((sum, row) => sum + num(row.change), 0) || num(order.change_due)
  const units = items.length

  return (
    <article ref={ref} className="receipt mx-auto w-full max-w-sm bg-white px-6 py-6 font-mono text-slate-900">
      <header className="text-center">
        <h2 className="text-xl font-bold tracking-tight">{storeName || "Store"}</h2>
        <p className="mt-1 text-xs text-slate-600">{locationName}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Sales receipt</p>
      </header>
      <Divider />
      <div className="space-y-1">
        <Line muted label="Order #" value={order.order_number} />
        {receipt?.receipt_number != null ? <Line muted label="Receipt #" value={receipt.receipt_number} /> : null}
        {order.local_receipt_number ? <Line muted label="POS receipt" value={order.local_receipt_number} /> : null}
        <Line muted label="Date" value={formatDateTime(receipt?.issued_at || order.placed_at)} />
        {order.batch ? <Line muted label="Batch" value={`#${order.batch.id}`} /> : null}
        {cashier?.name ? <Line muted label="Cashier" value={cashier.name} /> : null}
        <Line muted label="Customer" value={customer?.name ? `${customer.name}${customer.phone ? ` · ${customer.phone}` : ""}` : "Walk-in"} />
      </div>
      <Divider />

      <div className="space-y-3">
        {items.map((item) => {
          const price = itemPrice(item)
          return (
            <div key={item.id} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{item.title}</span>
                <span className="shrink-0 tabular-nums">{money(item.list_amount)}</span>
              </div>
              <p className="text-xs text-slate-600">
                {itemQtyText(item)} @ <Currency value={price.value} />/{price.per}
              </p>
              {num(item.free_qty) > 0 ? <p className="text-xs text-emerald-700">+ {num(item.free_qty)} free</p> : null}
              {num(item.discount_amount) > 0 ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{(item.discounts || []).map((d) => d.name).join(", ") || "Discount"}</span>
                  <span className="tabular-nums">−{money(item.discount_amount)}</span>
                </div>
              ) : null}
              {(item.taxes || []).map((tax, index) => (
                <div key={`${tax.name}-${index}`} className="flex justify-between text-xs text-slate-500">
                  <span>{tax.name} {rateText(tax)}</span>
                  <span className="tabular-nums">+{money(tax.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs font-semibold">
                <span>Line total</span>
                <span className="tabular-nums">{money(item.line_total)}</span>
              </div>
              {num(item.refunded_qty) > 0 ? <p className="text-xs text-rose-600">Refunded: {num(item.refunded_qty)}</p> : null}
            </div>
          )
        })}
        {!items.length ? <p className="text-sm text-slate-500">No items.</p> : null}
      </div>
      <Divider />

      <div className="space-y-1">
        <Line label={`Items (${units})`} value={money(order.gross_amount)} />
        {discounts.map((row) => <Line key={`${row.id}-${row.name}`} label={row.name} value={<>−{money(row.amount)}</>} />)}
        {num(order.discount_amount) > 0 ? <Line label="Order discount" value={<>−{money(order.discount_amount)}</>} /> : null}
        {num(order.coupon_discount_amount) > 0 ? <Line label={`Coupon${order.coupon_code ? ` ${order.coupon_code}` : ""}`} value={<>−{money(order.coupon_discount_amount)}</>} /> : null}
        <Line label="Subtotal" value={money(num(order.subtotal) - num(order.discount_amount) - num(order.coupon_discount_amount))} />
        {taxes.map((tax) => <Line key={`${tax.level}-${tax.name}-${tax.rate}`} label={`${tax.name} ${rateText(tax)}`} value={money(tax.amount)} />)}
        {surcharge > 0 ? <Line label="Payment surcharge" value={money(surcharge)} /> : null}
        {num(order.shipping_fee) > 0 ? <Line label="Shipping" value={money(order.shipping_fee)} /> : null}
      </div>
      <div className="my-3 border-t-2 border-slate-900" />
      <Line strong label="TOTAL" value={money(order.total_amount)} />
      <Divider />

      <div className="space-y-1">
        {pays.map((row, index) => (
          <div key={index}>
            <Line label={methodLabel(row.method)} value={money(row.amount)} />
            {row.surcharge > 0 ? <Line muted label={`  incl. surcharge${row.surcharge_type === "percentage" ? ` ${num(row.surcharge_value)}%` : ""}`} value={money(row.surcharge)} /> : null}
          </div>
        ))}
        <Line label="Paid" value={money(handed)} />
        {change > 0 ? <Line label="Change" value={money(change)} /> : null}
      </div>
      <Divider />
      {taxes.length ? (
        <p className="text-center text-[11px] text-slate-500">
          Taxes: {taxes.map((tax) => `${TAX_LEVEL_LABEL[tax.level] || "Tax"} – ${tax.name}`).join(" · ")}
        </p>
      ) : null}
      <p className="mt-2 text-center text-xs text-slate-600">Thank you for shopping with us!</p>
      <p className="mt-1 text-center text-[10px] text-slate-400">Printed {formatDate(new Date())}</p>
    </article>
  )
})
