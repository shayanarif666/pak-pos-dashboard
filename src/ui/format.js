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

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "mixed", label: "Mixed" },
]
