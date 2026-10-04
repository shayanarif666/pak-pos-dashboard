const TONES = {
  emerald: { wrap: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  amber: { wrap: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  sky: { wrap: "border-brand-200 bg-brand-50 text-brand-700", dot: "bg-brand-600" },
  brand: { wrap: "border-brand-200 bg-brand-50 text-brand-700", dot: "bg-brand-600" },
  violet: { wrap: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  rose: { wrap: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  blue: { wrap: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  fuchsia: { wrap: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700", dot: "bg-fuchsia-500" },
  cyan: { wrap: "border-cyan-200 bg-cyan-50 text-cyan-700", dot: "bg-cyan-500" },
  zinc: { wrap: "border-slate-200 bg-slate-100 text-slate-700", dot: "bg-slate-400" },
}

/** "stock_out" -> "Stock out", "clock_in" -> "Clock in". */
export function prettyStatus(value) {
  const text = String(value ?? "").replaceAll("_", " ").trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ""
}

export function Pill({ tone = "zinc", label, children, className = "", dot = true }) {
  const style = TONES[tone] || TONES.zinc
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        style.wrap,
        className,
      ].join(" ")}
    >
      {dot ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" /> : null}
      {label ? <span className="font-medium opacity-70">{label}:</span> : null}
      <span>{typeof children === "string" ? prettyStatus(children) : children}</span>
    </span>
  )
}

/** Badge for any status-like value; colour comes from statusTone() unless a tone is given. */
export function StatusBadge({ value, tone, label, children, className = "" }) {
  return (
    <Pill tone={tone || statusTone(value)} label={label} className={className}>
      {children ?? prettyStatus(value)}
    </Pill>
  )
}

const GREEN = [
  "live", "active", "paid", "enabled", "yes", "completed", "complete", "success", "approved",
  "ok", "in stock", "stock_in", "transfer_in", "refund", "credit", "published", "open", "balanced",
  "delivered", "valid",
]
const AMBER = [
  "pending", "draft", "monthly", "warning", "initiated", "low", "low stock", "partial",
  "adjustment", "count", "processing", "unpublished",
]
const RED = [
  "failed", "revoked", "off", "no", "inactive", "cancelled", "canceled", "voided", "void",
  "expired", "rejected", "critical", "out of stock", "stock_out", "sale", "transfer_out",
  "debit", "suspended", "damage", "theft", "waste",
]
const VIOLET = ["yearly", "web", "refunded", "custom", "mixed", "superadmin"]
const BRAND = ["pos", "store_admin", "cash", "default", "closed", "clock_out", "clock_in"]

export function statusTone(value) {
  const key = String(value || "").toLowerCase()
  if (GREEN.includes(key)) return "emerald"
  if (AMBER.includes(key)) return "amber"
  if (RED.includes(key)) return "rose"
  if (VIOLET.includes(key)) return "violet"
  if (BRAND.includes(key)) return "brand"
  if (["card", "jazzcash", "easypaisa", "cod", "cashier"].includes(key)) return "cyan"
  if (["grocery", "supermarket", "convenience"].includes(key)) return "brand"
  if (["boutique", "manager", "fashion", "clothing", "beauty", "jewelry"].includes(key)) return "fuchsia"
  if (["retail", "electronics", "wholesale"].includes(key)) return "blue"
  if (["pharmacy", "cafe", "bakery", "restaurant"].includes(key)) return "cyan"
  if (["furniture", "hardware", "sports", "books", "other"].includes(key)) return "violet"
  return "zinc"
}
