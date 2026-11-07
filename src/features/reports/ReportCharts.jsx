import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { formatCurrency, formatNumber } from "../../ui/Currency.jsx"

/*
 * Report charts: plain SVG / HTML, every mark with a hover (and keyboard focus) tooltip.
 * One series = the brand green; several categories = the fixed categorical order below
 * (validated for colour-blind separation on a white surface), never cycled by rank.
 */

export const BRAND = "#135c4c"
// Categorical slots (light surface), in this fixed order. Slots 3–5 are under 3:1 contrast on
// white, so every chart that uses them also prints its labels and values.
export const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
const OTHER = "#94a3b8"
export const colorAt = (index) => (index < PALETTE.length ? PALETTE[index] : OTHER)

// Payment methods keep one colour wherever they appear (colour follows the entity).
const METHOD_SLOT = { cash: 0, card: 1, jazzcash: 2, easypaisa: 3, bank_transfer: 4, raast: 5, credit: 6, online: 7 }
export const methodColor = (method) => {
  const slot = METHOD_SLOT[String(method || "").toLowerCase()]
  return slot == null ? OTHER : PALETTE[slot]
}

/** Rs. 10.6k / Rs. 1.2M for axis ticks. */
export function compactMoney(value) {
  const n = Number(value || 0)
  const abs = Math.abs(n)
  if (abs >= 1e6) return `Rs. ${formatNumber(n / 1e6, { maximumFractionDigits: 1 })}M`
  if (abs >= 1e3) return `Rs. ${formatNumber(n / 1e3, { maximumFractionDigits: 1 })}k`
  return `Rs. ${formatNumber(n, { maximumFractionDigits: 0 })}`
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
/** "2026-11-06" → "6 Nov"; anything else as it is. */
export function shortLabel(label) {
  const text = String(label ?? "")
  if (ISO_DAY.test(text)) {
    const date = new Date(`${text}T00:00:00`)
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
  }
  return text
}

/** A tidy max and ticks for an axis from 0. */
function niceScale(max, count = 4) {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] }
  const raw = max / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) || raw
  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { top, ticks }
}

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return undefined
    const el = ref.current
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

/** The floating readout: value first (strong), then its label and any extra lines. */
function Tooltip({ tip }) {
  if (!tip) return null
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 min-w-36 max-w-64 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)]"
      style={{ left: tip.x, top: tip.y - 10 }}
    >
      <p className="text-sm font-semibold tabular-nums text-slate-950">{tip.value}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-slate-600">
        {tip.color ? <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: tip.color }} /> : null}
        <span className="truncate">{tip.label}</span>
      </p>
      {(tip.extra || []).map(([label, value]) => (
        <p key={label} className="mt-0.5 flex justify-between gap-3 text-slate-500">
          <span>{label}</span>
          <span className="tabular-nums text-slate-700">{value}</span>
        </p>
      ))}
    </div>
  )
}

export function ChartCard({ title, subtitle, legend = null, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {legend}
        </div>
      ) : null}
      {children}
    </section>
  )
}

const Empty = ({ text }) => <p className="flex h-40 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">{text}</p>

/**
 * Columns over time (or any ordered buckets), with a y-axis from 0 and a tooltip per column.
 * extra(row) → [[label, text]] lines for the tooltip.
 */
export function ColumnChart({ items = [], valueKey = "sales", labelKey = "bucket", format = formatCurrency, axisFormat = compactMoney, extra, empty = "No data in these dates", height = 240, color = BRAND }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const rows = items.map((row) => ({ row, label: String(row[labelKey] ?? ""), value: Number(row[valueKey] ?? 0) }))
  const any = rows.some((r) => r.value > 0)
  const { top, ticks } = niceScale(Math.max(0, ...rows.map((r) => r.value)))
  const m = { left: 64, right: 12, top: 12, bottom: 30 }
  const innerW = Math.max(0, width - m.left - m.right)
  const innerH = height - m.top - m.bottom
  const band = rows.length ? innerW / rows.length : 0
  const barW = Math.max(4, Math.min(24, band * 0.62))
  const every = Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor(innerW / 64))))
  const y = (v) => m.top + innerH - (v / top) * innerH

  const tip = hover == null ? null : (() => {
    const r = rows[hover]
    return {
      x: m.left + band * hover + band / 2,
      y: y(r.value),
      value: format(r.value),
      label: shortLabel(r.label),
      extra: extra ? extra(r.row) : [],
    }
  })()

  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => setHover(null)}>
      {!any ? (
        <Empty text={empty} />
      ) : width > 0 ? (
        <svg width={width} height={height} role="img" aria-label="Column chart">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef2f6"} />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#64748b">{axisFormat(t)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const x = m.left + band * i + (band - barW) / 2
            const h = Math.max(r.value > 0 ? 2 : 0, innerH - (y(r.value) - m.top))
            const yTop = m.top + innerH - h
            const radius = Math.min(4, h, barW / 2)
            const path = h > 0
              ? `M${x},${yTop + h} V${yTop + radius} Q${x},${yTop} ${x + radius},${yTop} H${x + barW - radius} Q${x + barW},${yTop} ${x + barW},${yTop + radius} V${yTop + h} Z`
              : ""
            return (
              <g key={`${r.label}-${i}`}>
                {path ? <path d={path} fill={color} opacity={hover == null || hover === i ? 1 : 0.45} /> : null}
                {i % every === 0 ? (
                  <text x={m.left + band * i + band / 2} y={height - 10} textAnchor="middle" fontSize="11" fill="#64748b">{shortLabel(r.label)}</text>
                ) : null}
                {/* The hit target is the whole column slot, not only the painted bar. */}
                <rect
                  x={m.left + band * i}
                  y={m.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${shortLabel(r.label)}: ${format(r.value)}`}
                  onPointerEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="cursor-pointer outline-none"
                />
              </g>
            )
          })}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

/**
 * A ranking: one horizontal bar per item, longest first, value printed at the end.
 * items = [{ label, value, sub?, extra?: [[label, text]] }].
 */
export function HBarChart({ items = [], format = formatCurrency, empty = "No data in these dates", maxBars = 10, color = BRAND, showShare = true }) {
  const [hover, setHover] = useState(null)
  const wrap = useRef(null)
  const rows = useMemo(
    () => items.filter((row) => Number(row.value) > 0).sort((a, b) => Number(b.value) - Number(a.value)),
    [items]
  )
  if (!rows.length) return <Empty text={empty} />
  const shown = rows.slice(0, maxBars)
  const rest = rows.slice(maxBars)
  const total = rows.reduce((sum, row) => sum + Number(row.value), 0)
  const max = Math.max(...shown.map((row) => Number(row.value)))
  const share = (value) => (total > 0 ? `${formatNumber((Number(value) / total) * 100, { maximumFractionDigits: 1 })}%` : "—")

  return (
    <div ref={wrap} className="relative space-y-2.5" onPointerLeave={() => setHover(null)}>
      {shown.map((row, index) => {
        const width = `${Math.max(1.5, (Number(row.value) / max) * 100)}%`
        return (
          <div
            key={`${row.label}-${index}`}
            tabIndex={0}
            onPointerEnter={(event) => {
              const box = wrap.current.getBoundingClientRect()
              const el = event.currentTarget.getBoundingClientRect()
              setHover({ index, x: el.left - box.left + el.width / 2, y: el.top - box.top })
            }}
            onFocus={(event) => {
              const box = wrap.current.getBoundingClientRect()
              const el = event.currentTarget.getBoundingClientRect()
              setHover({ index, x: el.left - box.left + el.width / 2, y: el.top - box.top })
            }}
            onBlur={() => setHover(null)}
            className={`grid cursor-default grid-cols-[minmax(0,9rem)_minmax(0,1fr)_6.5rem] items-center gap-3 rounded-lg px-1 py-0.5 outline-none transition sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_7.5rem] ${hover?.index === index ? "bg-slate-50" : ""}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800" title={row.label}>{row.label}</p>
              {row.sub ? <p className="truncate text-xs text-slate-500">{row.sub}</p> : null}
            </div>
            <div className="h-2.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width, background: color, opacity: hover == null || hover.index === index ? 1 : 0.5 }} />
            </div>
            <p className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-slate-900">{format(row.value)}</p>
          </div>
        )
      })}
      {rest.length ? <p className="pl-1 text-xs text-slate-500">+ {rest.length} more in the table below</p> : null}
      {hover ? (
        <Tooltip
          tip={{
            x: hover.x,
            y: hover.y,
            value: format(shown[hover.index].value),
            label: shown[hover.index].label,
            color,
            extra: [...(showShare ? [["Share", share(shown[hover.index].value)]] : []), ...(shown[hover.index].extra || [])],
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * One whole split into parts (e.g. takings by payment method): a segmented bar with 2px gaps,
 * then a legend that prints every part's value and share. items = [{ key, label, value, color? }].
 */
export function ShareBar({ items = [], format = formatCurrency, empty = "No data in these dates", colorOf = (row, index) => colorAt(index) }) {
  const [hover, setHover] = useState(null)
  const wrap = useRef(null)
  const rows = items.filter((row) => Number(row.value) > 0).sort((a, b) => Number(b.value) - Number(a.value))
  if (!rows.length) return <Empty text={empty} />
  const total = rows.reduce((sum, row) => sum + Number(row.value), 0)
  const pct = (value) => (Number(value) / total) * 100

  const show = (event, index) => {
    const box = wrap.current.getBoundingClientRect()
    const el = event.currentTarget.getBoundingClientRect()
    setHover({ index, x: el.left - box.left + el.width / 2, y: el.top - box.top })
  }

  return (
    <div ref={wrap} className="relative" onPointerLeave={() => setHover(null)}>
      <div className="flex h-7 w-full gap-[2px] overflow-hidden rounded-md">
        {rows.map((row, index) => (
          <div
            key={row.key || row.label}
            tabIndex={0}
            onPointerEnter={(event) => show(event, index)}
            onFocus={(event) => show(event, index)}
            onBlur={() => setHover(null)}
            className="h-full outline-none transition first:rounded-l-md last:rounded-r-md"
            style={{ width: `${pct(row.value)}%`, minWidth: 4, background: row.color || colorOf(row, index), opacity: hover == null || hover.index === index ? 1 : 0.55 }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((row, index) => (
          <li key={row.key || row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: row.color || colorOf(row, index) }} />
              <span className="truncate text-slate-700">{row.label}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums text-slate-900">
              <span className="font-semibold">{format(row.value)}</span>
              <span className="ml-1.5 text-xs text-slate-500">{formatNumber(pct(row.value), { maximumFractionDigits: 1 })}%</span>
            </span>
          </li>
        ))}
      </ul>
      {hover ? (
        <Tooltip
          tip={{
            x: hover.x,
            y: hover.y,
            value: format(rows[hover.index].value),
            label: rows[hover.index].label,
            color: rows[hover.index].color || colorOf(rows[hover.index], hover.index),
            extra: [["Share", `${formatNumber(pct(rows[hover.index].value), { maximumFractionDigits: 1 })}%`], ...(rows[hover.index].extra || [])],
          }}
        />
      ) : null}
    </div>
  )
}

/** Orders by hour × weekday: one green, darker = busier, with a tooltip per cell. */
export function Heatmap({ rows = [], days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }) {
  const [hover, setHover] = useState(null)
  const wrap = useRef(null)
  const active = rows.filter((row) => days.some((day) => Number(row[day] || 0) > 0))
  if (!active.length) return <Empty text="No orders in these dates" />
  // Only the hours that had sales, plus one either side, so the grid stays readable.
  const hours = rows.map((row) => row.hour)
  const first = Math.max(0, hours.indexOf(active[0].hour) - 1)
  const last = Math.min(rows.length - 1, hours.indexOf(active[active.length - 1].hour) + 1)
  const shown = rows.slice(first, last + 1)
  const max = Math.max(1, ...shown.flatMap((row) => days.map((day) => Number(row[day] || 0))))

  return (
    <div ref={wrap} className="relative overflow-x-auto" onPointerLeave={() => setHover(null)}>
      <table className="mx-auto border-separate border-spacing-[3px] text-xs">
        <thead>
          <tr>
            <th />
            {days.map((day) => <th key={day} className="px-1 pb-1 font-semibold text-slate-500">{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row.hour}>
              <td className="pr-2 text-right tabular-nums text-slate-500">{row.hour}</td>
              {days.map((day) => {
                const value = Number(row[day] || 0)
                const level = value / max
                return (
                  <td key={day} className="p-0">
                    <div
                      tabIndex={0}
                      onPointerEnter={(event) => {
                        const box = wrap.current.getBoundingClientRect()
                        const el = event.currentTarget.getBoundingClientRect()
                        setHover({ x: el.left - box.left + el.width / 2 + wrap.current.scrollLeft, y: el.top - box.top, day, hour: row.hour, value })
                      }}
                      onBlur={() => setHover(null)}
                      className="flex h-8 w-12 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums outline-none"
                      style={{ background: value ? `rgba(19, 92, 76, ${0.15 + level * 0.85})` : "#f1f5f9", color: level > 0.5 ? "#fff" : "#0f172a" }}
                    >
                      {value || ""}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Tooltip tip={hover ? { x: hover.x, y: hover.y, value: `${hover.value} order${hover.value === 1 ? "" : "s"}`, label: `${hover.day} · ${hover.hour}` } : null} />
    </div>
  )
}

/** These dates vs the dates before: two bars per metric (now = green, before = gray). */
export function ComparisonBars({ rows = [] }) {
  const [hover, setHover] = useState(null)
  if (!rows.length) return <Empty text="Nothing to compare" />
  const isCount = (metric) => ["Orders", "Units sold"].includes(metric)
  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: BRAND }} /> These dates</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> Before</span>
      </div>
      {rows.map((row, index) => {
        const fmt = (v) => (isCount(row.metric) ? formatNumber(v) : formatCurrency(v))
        const max = Math.max(Math.abs(Number(row.current || 0)), Math.abs(Number(row.previous || 0)), 1)
        const up = Number(row.change || 0) >= 0
        return (
          <div key={row.metric} onPointerEnter={() => setHover(index)} onPointerLeave={() => setHover(null)} className={`rounded-xl px-2 py-1.5 ${hover === index ? "bg-slate-50" : ""}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-slate-800">{row.metric}</span>
              <span className="whitespace-nowrap tabular-nums">
                <span className="font-semibold text-slate-950">{fmt(row.current)}</span>
                <span className="ml-2 text-xs text-slate-500">vs {fmt(row.previous)}</span>
                <span className={`ml-2 text-xs font-semibold ${Number(row.change) === 0 ? "text-slate-500" : up ? "text-emerald-700" : "text-rose-700"}`}>
                  {up ? "▲" : "▼"} {formatNumber(Math.abs(Number(row.change_percent || 0)), { maximumFractionDigits: 1 })}%
                </span>
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(Math.abs(Number(row.current || 0)) / max) * 100}%`, background: BRAND }} /></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-300" style={{ width: `${(Math.abs(Number(row.previous || 0)) / max) * 100}%` }} /></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Kept for older imports.
export const ReportChartCard = ChartCard
