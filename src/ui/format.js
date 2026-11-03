/** "25 Oct 2026, 1:18 PM" — or "—" when there is no date. */
export function formatDateTime(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
}

/** "25 Oct 2026". */
export function formatDate(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
}

export const toNumber = (value) => (value === null || value === undefined || value === "" ? null : Number(value))

/** Every payment method the API takes (PAYMENT_METHOD on the backend), as shown. */
export const PAYMENT_METHOD_LABEL = {
  cash: "Cash",
  card: "Card",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
  raast: "Raast",
  sadapay: "SadaPay",
  nayapay: "NayaPay",
  upaisa: "UPaisa",
  digital_wallet: "Other digital wallet",
  cheque: "Cheque",
  online: "Online payment",
  other: "Other",
}

/** The methods one payment can be made with (no "mixed"). */
export const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({ value, label }))

/** Order filters: every method, plus mixed (a split payment). */
export const PAYMENT_METHOD_OPTIONS = [...PAYMENT_METHODS, { value: "mixed", label: "Mixed" }]
