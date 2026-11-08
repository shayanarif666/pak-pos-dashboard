import { formatCurrency, formatNumber } from "../../ui/Currency.jsx"
import { formatDateTime } from "../../ui/format.js"
import { humanize } from "../../lib/exportFile.js"
import { unitShort } from "../../ui/units.js"

/*
 * How a reporting value is shown, from its key: counts as numbers (with the product's unit when
 * the row has one), money as Rs, *_percent as %, hours / days with their unit, dates as
 * date-time, references ({ id, name }) by their name.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const COUNT_RE = /(orders|units|qty|count|sessions|days|hours|products|customers|suppliers|batches|stock|transfers|lines|returns|purchases|shown|^total$|^repeat|_number$|^hour$)/
const MONEY_RE = /(amount|sales|tax|discount|refund|cost|profit|cash|balance|spent|value|price|variance|owed|debt|net|gross|takings|collected|shipping|billed|paid|change|fbr|surcharge|charges|short|over)/
// Quantities of one product: shown with the row's unit ("250 gm", "10 bottles").
const QTY_RE = /^(units|units_sold|qty|stock|current_stock|stock_in|stock_out|free_units|units_received|units_returned|units_sent|avg_daily_sales|loss_units)$/
// A metric row (Period Comparison) is money unless the metric is a count.
const COUNT_METRICS = new Set(["Orders", "Units sold"])
// Columns kept for actions / exports, never shown in a report table.
export const HIDDEN_COLUMNS = new Set(["id", "unit", "cashier_id", "staff_number", "location_number", "location_id", "session_id"])

const LABELS = {
  units_sold: "Qty sold",
  units: "Qty",
  current_stock: "In stock",
  stock_in: "Stock in",
  stock_out: "Stock out",
  avg_daily_sales: "Avg sold / day",
  days_left: "Days left",
  days_since_sale: "Days since sale",
  hours_worked: "Hours worked",
  batch_number: "Batch #",
  opening_amount: "Opening cash",
  date_time: "Opened",
  closed_at: "Closed",
  total_sales: "Total sales",
  net_sales: "Net sales",
  gross_sales: "Gross sales",
  product_tax: "Product & store tax",
  sales_tax: "Sales tax",
  payment_method_tax: "Payment surcharge",
  tax_collected: "Tax collected",
  margin_percent: "Margin",
  percent: "Share",
  clock_in_at: "Clock in",
  clock_out_at: "Clock out",
  on_duty_now: "On duty now",
  top_only: "Top list only",
  avg_order_value: "Average order",
  total_collected: "Collected",
  on_credit: "Udhaar (on credit)",
  payments_net: "Payments (net)",
}

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value)
}

export const columnLabel = (key) => LABELS[key] || humanize(key)

/** The text of a reference object: its name / title / label, else its id. */
function refText(value) {
  return value.name ?? value.title ?? value.label ?? value.product ?? (value.id != null ? `#${value.id}` : "")
}

const baseName = (key) => String(key).split(".").pop().toLowerCase()

/** Money, a count or text — used to right-align numbers. */
export function isNumericKey(key) {
  const name = baseName(key)
  return QTY_RE.test(name) || COUNT_RE.test(name) || MONEY_RE.test(name) || name.endsWith("percent") || name === "batch_number"
}

export function formatValue(key, value, row = null) {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.map((item) => (item && typeof item === "object" ? refText(item) : item)).join(", ") || "—"
  if (typeof value === "object") return refText(value) || "—"
  const name = baseName(key)
  if (typeof value === "string" && ISO_RE.test(value)) return formatDateTime(value)
  const number = Number(value)
  if (value === "" || Number.isNaN(number) || typeof value === "boolean") return String(value).replaceAll("_", " ")
  if (name === "batch_number" || name === "session" || name === "supplier_number" || name === "order") return `#${number}`
  if (name.endsWith("percent") || name === "percent" || name.endsWith("_pct")) return `${formatNumber(number, { maximumFractionDigits: 2 })}%`
  if (row?.metric && ["current", "previous", "change"].includes(name)) {
    return COUNT_METRICS.has(row.metric) ? formatNumber(number) : formatCurrency(number)
  }
  if (name === "hours_worked") return `${formatNumber(number, { maximumFractionDigits: 2 })} h`
  if (name === "days_left" || name === "days_since_sale") return `${formatNumber(number)} day${number === 1 ? "" : "s"}`
  if (QTY_RE.test(name)) {
    const text = formatNumber(number, { maximumFractionDigits: 3 })
    return row?.unit ? `${text} ${unitShort(row.unit)}` : text
  }
  // A tax rate / surcharge: a percentage, or an amount for a fixed one.
  if ((name === "rate" || name === "surcharge_value") && row) {
    const type = row.tax_type || row.surcharge_type
    if (type === "percentage") return `${formatNumber(number, { maximumFractionDigits: 2 })}%`
    if (type === "fixed") return formatCurrency(number)
  }
  if (COUNT_RE.test(name) && !/(sales|amount|value|cost|tax)/.test(name)) return formatNumber(number, { maximumFractionDigits: 2 })
  if (MONEY_RE.test(name)) return formatCurrency(number)
  return formatNumber(number, { maximumFractionDigits: 2 })
}

/** A value that goes up (+) or down (−) — shown green / red. */
export function toneOf(key, value) {
  const name = baseName(key)
  if (!["change", "change_percent", "variance", "cash_variance", "cash_short"].includes(name)) return ""
  const number = Number(value)
  if (!number) return ""
  return number > 0 ? "text-emerald-700" : "text-rose-700"
}

/** Flattens a summary object: { taxes: { sales_tax } } → [["taxes.sales_tax", value]]. */
export function flattenSummary(summary, prefix = "") {
  const out = []
  for (const [key, value] of Object.entries(summary || {})) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object" && !Array.isArray(value)) out.push(...flattenSummary(value, path))
    else if (!isUuid(value)) out.push([path, value])
  }
  return out
}

/** A summary key's label: "taxes.payment_method_tax.cash" → "Payment surcharge · Cash". */
export function summaryLabel(path) {
  const parts = String(path).split(".").filter((part) => part !== "totals")
  return parts.slice(-2).map(columnLabel).join(" · ")
}

/** Table columns from the rows: every key, nested objects by name, UUID-only and helper columns left out. */
export function columnsOf(rows) {
  const keys = []
  const seen = new Set()
  for (const row of rows) {
    for (const [key, value] of Object.entries(row || {})) {
      if (seen.has(key) || HIDDEN_COLUMNS.has(key)) continue
      // A list inside a row (an order's lines…) is in the export, not in the table.
      if (Array.isArray(value) && value.some((item) => item && typeof item === "object")) continue
      seen.add(key)
      keys.push(key)
    }
  }
  return keys.filter((key) => rows.some((row) => row[key] != null && !isUuid(row[key])))
}
