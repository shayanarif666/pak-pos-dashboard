import { formatCurrency, formatNumber } from "../../ui/Currency.jsx"
import { formatDateTime } from "../../ui/format.js"
import { humanize } from "../../lib/exportFile.js"

/*
 * How a reporting value is shown, from its key: counts as numbers, money as Rs, *_percent as %,
 * dates as date-time, references ({ id, name }) by their name.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const COUNT_RE = /(orders|units|qty|count|sessions|days|hours|products|customers|suppliers|batches|stock|transfers|lines|returns|purchases|shown|^total$|^repeat|_number$|^hour$)/
const MONEY_RE = /(amount|sales|tax|discount|refund|cost|profit|cash|balance|spent|value|price|variance|owed|debt|net|gross|takings|collected|shipping|billed|paid|change|fbr|surcharge|charges)/
// A metric row (Period Comparison) is money unless the metric is a count.
const COUNT_METRICS = new Set(["Orders", "Units sold"])

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value)
}

/** The text of a reference object: its name / title / label, else its id. */
function refText(value) {
  return value.name ?? value.title ?? value.label ?? value.product ?? (value.id != null ? `#${value.id}` : "")
}

export function formatValue(key, value, row = null) {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.map((item) => (item && typeof item === "object" ? refText(item) : item)).join(", ") || "—"
  if (typeof value === "object") return refText(value) || "—"
  const name = String(key).split(".").pop().toLowerCase()
  if (typeof value === "string" && ISO_RE.test(value)) return formatDateTime(value)
  const number = Number(value)
  if (value === "" || Number.isNaN(number) || typeof value === "boolean") return String(value).replaceAll("_", " ")
  if (name.endsWith("percent") || name === "percent" || name.endsWith("_pct")) return `${formatNumber(number, { maximumFractionDigits: 2 })}%`
  if (row?.metric && ["current", "previous", "change"].includes(name)) {
    return COUNT_METRICS.has(row.metric) ? formatNumber(number) : formatCurrency(number)
  }
  if (COUNT_RE.test(name) && !/(sales|amount|value|cost|tax)/.test(name)) return formatNumber(number, { maximumFractionDigits: 2 })
  if (MONEY_RE.test(name)) return formatCurrency(number)
  return formatNumber(number, { maximumFractionDigits: 2 })
}

/** A value that goes up (+) or down (−) — shown green / red. */
export function toneOf(key, value) {
  const name = String(key).split(".").pop().toLowerCase()
  if (!["change", "change_percent", "variance", "cash_variance"].includes(name)) return ""
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

/** A summary key's label: "taxes.payment_method_tax.cash" → "Payment method tax · Cash". */
export function summaryLabel(path) {
  const parts = String(path).split(".").filter((part) => part !== "totals")
  return parts.slice(-2).map(humanize).join(" · ")
}

/** Table columns from the rows: every key, nested objects by name, UUID-only columns left out. */
export function columnsOf(rows) {
  const keys = []
  const seen = new Set()
  for (const row of rows) {
    for (const [key, value] of Object.entries(row || {})) {
      if (seen.has(key)) continue
      // A list inside a row (an order's lines…) is in the export, not in the table.
      if (Array.isArray(value) && value.some((item) => item && typeof item === "object")) continue
      seen.add(key)
      keys.push(key)
    }
  }
  return keys.filter((key) => rows.some((row) => row[key] != null && !isUuid(row[key])))
}
