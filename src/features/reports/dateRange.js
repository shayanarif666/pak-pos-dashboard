function pad(n) {
  return String(n).padStart(2, "0")
}

/** Parse YYYY-MM-DD as a local calendar date (not UTC midnight). */
function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getTime())
  const raw = String(value || "").trim()
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (day) {
    return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 0, 0, 0, 0)
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function toDateInput(date) {
  const d = parseLocalDate(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function startOfDay(date) {
  const d = parseLocalDate(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date) {
  const d = parseLocalDate(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export const REPORT_PRESETS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom" },
]

/**
 * Returns inclusive local-day bounds as ISO timestamps so the API matches
 * the browser calendar (e.g. Asia/Karachi) instead of bare UTC date strings.
 */
export function rangeForPreset(presetId, custom = {}) {
  const now = new Date()
  if (presetId === "custom") {
    if (!custom.from && !custom.to) return { from: "", to: "" }
    return {
      from: custom.from ? startOfDay(custom.from).toISOString() : "",
      to: custom.to ? endOfDay(custom.to).toISOString() : "",
    }
  }
  if (presetId === "today") {
    return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
  }
  if (presetId === "week") {
    const start = startOfDay(now)
    const day = start.getDay() || 7
    start.setDate(start.getDate() - (day - 1))
    return { from: start.toISOString(), to: endOfDay(now).toISOString() }
  }
  if (presetId === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    return { from: start.toISOString(), to: endOfDay(now).toISOString() }
  }
  if (presetId === "year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    return { from: start.toISOString(), to: endOfDay(now).toISOString() }
  }
  return { from: "", to: "" }
}

export function periodForPreset(presetId) {
  if (presetId === "year") return "monthly"
  if (presetId === "month" || presetId === "week") return "daily"
  return "daily"
}
