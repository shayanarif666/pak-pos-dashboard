import { unitShort } from "../../ui/units.js"

// How an order's figures are read for the detail page and the receipt (all from GET /orders/:id).

export const num = (value) => Number(value || 0)
const round2 = (value) => Math.round(num(value) * 100) / 100

export const TAX_LEVEL_LABEL = { product: "Product tax", store: "Taxes page", category: "Category tax" }

/** "1 pack × 5 bottles" / "2.5 kg" / "2 boxes". */
export function itemQtyText(item) {
  const unit = unitShort(item.unit)
  if (item.sale_unit === "pack" && item.pack_size) {
    const packs = item.qty_packs ?? round2(num(item.quantity) / num(item.pack_size))
    return `${packs} ${Number(packs) === 1 ? "pack" : "packs"} × ${item.pack_size} ${unit}`
  }
  return `${num(item.quantity)} ${unit}`
}

/** The price the line was sold at: per pack for a pack line, else per unit. */
export function itemPrice(item) {
  if (item.sale_unit === "pack" && item.pack_price != null) return { value: item.pack_price, per: "pack" }
  return { value: item.unit_price, per: unitShort(item.unit) }
}

/** Every tax of the order, added up by tax (name + rate + where it is set). */
export function taxSummary(items) {
  const map = new Map()
  for (const item of items) {
    for (const tax of item.taxes || []) {
      const key = `${tax.level || "product"}|${tax.name}|${tax.rate ?? ""}`
      const row = map.get(key) || { level: tax.level || "product", name: tax.name || "Tax", rate: tax.rate, type: tax.type, amount: 0 }
      row.amount = round2(row.amount + num(tax.amount))
      map.set(key, row)
    }
  }
  return [...map.values()]
}

/** Every discount of the order, added up by discount (plus line discounts without a name). */
export function discountSummary(items) {
  const map = new Map()
  for (const item of items) {
    const named = item.discounts || []
    for (const discount of named) {
      const key = `${discount.id ?? ""}|${discount.name}`
      const row = map.get(key) || { id: discount.id ?? null, name: discount.name || "Discount", type: discount.type, value: discount.discount_value, discount_type: discount.discount_type, amount: 0 }
      row.amount = round2(row.amount + num(discount.amount))
      map.set(key, row)
    }
    const namedTotal = named.reduce((sum, row) => sum + num(row.amount), 0)
    const rest = round2(num(item.discount_amount) - namedTotal)
    if (rest > 0.009) {
      const label = item.discount_source === "product" ? "Product discount" : item.discount_source === "category" ? "Category discount" : "Item discount"
      const row = map.get(label) || { id: null, name: label, amount: 0 }
      row.amount = round2(row.amount + rest)
      map.set(label, row)
    }
  }
  return [...map.values()]
}

/**
 * The payments as the sale saved them: method, its share of the bill, surcharge, what was paid
 * and the change (tax.payment_gst), joined with the payment rows (status, transaction #, time).
 */
export function paymentRows(order, payments) {
  const split = Array.isArray(order?.tax?.payment_gst) ? order.tax.payment_gst : []
  if (!split.length) {
    return payments.map((row) => ({
      method: row.method, bill_share: num(row.amount) - num(row.tax_amount), surcharge: num(row.tax_amount),
      surcharge_type: null, surcharge_value: null, amount: num(row.amount), paid: num(row.amount), change: 0,
      status: row.status, transaction_number: row.transaction_number, paid_at: row.paid_at || row.created_at,
      reference: row.gateway_transaction_id || null,
    }))
  }
  return split.map((row, index) => {
    const saved = payments.filter((p) => p.method === row.method)[split.filter((s, i) => i < index && s.method === row.method).length] || payments[index] || {}
    return {
      method: row.method,
      bill_share: num(row.bill_share),
      surcharge: num(row.surcharge_amount ?? row.gst_amount),
      surcharge_type: row.surcharge_type || null,
      surcharge_value: row.surcharge_value ?? null,
      amount: num(row.amount),
      paid: num(row.paid ?? row.amount),
      change: num(row.change),
      status: saved.status || "success",
      transaction_number: saved.transaction_number ?? null,
      paid_at: saved.paid_at || saved.created_at || null,
      reference: saved.gateway_transaction_id || null,
    }
  })
}

export const methodLabel = (method) =>
  ({ cash: "Cash", card: "Card", jazzcash: "JazzCash", easypaisa: "Easypaisa", bank_transfer: "Bank transfer", credit: "Udhaar", mixed: "Split payment" })[method] ||
  (method ? method.charAt(0).toUpperCase() + method.slice(1) : "—")

export const rateText = (tax) => (tax.type === "fixed" ? "fixed" : tax.rate != null ? `${num(tax.rate)}%` : "")
