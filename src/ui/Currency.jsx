/** Default storefront / POS currency label. */
export const DEFAULT_CURRENCY = "Rs."

/** Plain number (no currency) — qty, units, stock, etc. */
export function formatNumber(value, options = {}) {
  const { fallback = "—", maximumFractionDigits = 2 } = options
  const n = Number(value)
  if (Number.isNaN(n)) return fallback
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}

/**
 * Format a numeric amount with currency prefix.
 * @param {unknown} value
 * @param {{ currency?: string, fallback?: string, signed?: boolean }} [options]
 */
export function formatCurrency(value, options = {}) {
  const {
    currency = DEFAULT_CURRENCY,
    fallback = "—",
    signed = false,
  } = options
  const n = Number(value)
  if (Number.isNaN(n)) return fallback
  const formatted = formatNumber(Math.abs(n), { fallback })
  if (formatted === fallback) return fallback
  const sign = signed && n < 0 ? "−" : ""
  const prefix = currency ? `${currency} ` : ""
  return `${sign}${prefix}${formatted}`
}

/**
 * Global currency display. Default currency is Rs.
 *
 * @example
 * <Currency value={order.total_amount} />
 * <Currency value={discount} signed />
 */
export function Currency({
  value,
  currency = DEFAULT_CURRENCY,
  fallback = "—",
  signed = false,
  className = "",
}) {
  return (
    <span className={["tabular-nums", className].filter(Boolean).join(" ")}>
      {formatCurrency(value, { currency, fallback, signed })}
    </span>
  )
}

export default Currency
