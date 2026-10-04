import { formatCurrency } from "../../ui/Currency.jsx"

// Blue-led palette with enough contrast on a white background.
const PALETTE = [
  "#135c4c", // brand green
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#e11d48", // rose
  "#7c3aed", // violet
  "#14b8a6", // teal
  "#64748b", // slate
]

function ChartCard({ title, children, empty }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
      {title ? <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2> : null}
      {empty ? <p className="py-10 text-center text-sm text-slate-500">{empty}</p> : children}
    </div>
  )
}

function colorAt(index) {
  return PALETTE[index % PALETTE.length]
}

/** Horizontal bars — good for rankings / mix. */
export function HBarChart({
  items = [],
  valueKey = "value",
  labelKey = "label",
  formatValue = formatCurrency,
  empty = "No data to chart",
  maxBars = 12,
}) {
  const rows = items
    .map((row, index) => ({
      id: row.id || row[labelKey] || index,
      label: row[labelKey] ?? row.label ?? "—",
      value: Number(row[valueKey] ?? row.value ?? 0),
      color: row.color || colorAt(index),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars)

  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>
  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const width = `${Math.max(4, Math.round((row.value / max) * 100))}%`
        return (
          <div key={row.id}>
            <div className="mb-1 flex justify-between gap-3 text-xs text-slate-600">
              <span className="truncate capitalize text-slate-700">{row.label}</span>
              <span className="shrink-0 tabular-nums text-slate-800">{formatValue(row.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-brand-50">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width, background: row.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Vertical column chart — sales trend over time. */
export function ColumnChart({
  items = [],
  valueKey = "sales",
  labelKey = "bucket",
  formatValue = formatCurrency,
  empty = "No trend data",
  height = 180,
}) {
  const rows = items.map((row, index) => ({
    id: row.id || row[labelKey] || index,
    label: String(row[labelKey] ?? ""),
    value: Number(row[valueKey] ?? 0),
  }))
  if (!rows.length || rows.every((row) => row.value <= 0)) {
    return <p className="text-sm text-slate-500">{empty}</p>
  }

  const max = Math.max(1, ...rows.map((row) => row.value))
  const barW = Math.max(18, Math.min(48, Math.floor(560 / rows.length) - 8))
  const gap = 8
  const width = rows.length * (barW + gap) + 24
  const chartH = height - 28

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-full"
        style={{ height }}
        role="img"
        aria-label="Column chart"
      >
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = chartH - chartH * t + 4
          return (
            <line
              key={t}
              x1={0}
              x2={width}
              y1={y}
              y2={y}
              stroke="rgba(15,23,42,0.08)"
              strokeWidth="1"
            />
          )
        })}
        {rows.map((row, index) => {
          const h = Math.max(2, (row.value / max) * chartH)
          const x = 12 + index * (barW + gap)
          const y = chartH - h + 4
          return (
            <g key={row.id}>
              <title>{`${row.label}: ${formatValue(row.value)}`}</title>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={6}
                fill={colorAt(index)}
                opacity={0.9}
              >
                <animate
                  attributeName="height"
                  from="0"
                  to={h}
                  dur="0.45s"
                  fill="freeze"
                />
                <animate attributeName="y" from={chartH + 4} to={y} dur="0.45s" fill="freeze" />
              </rect>
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fill="#475569"
                fontSize="11"
              >
                {row.label.length > 8 ? `${row.label.slice(0, 7)}…` : row.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Donut / pie for share breakdowns. */
export function DonutChart({
  items = [],
  valueKey = "value",
  labelKey = "label",
  formatValue = formatCurrency,
  empty = "No share data",
  size = 200,
  thickness = 28,
}) {
  const rows = items
    .map((row, index) => ({
      id: row.id || row[labelKey] || index,
      label: row[labelKey] ?? row.label ?? "—",
      value: Number(row[valueKey] ?? row.value ?? 0),
      color: row.color || colorAt(index),
    }))
    .filter((row) => row.value > 0)

  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>

  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const r = size / 2 - 4
  const inner = Math.max(8, r - thickness)
  const cx = size / 2
  const cy = size / 2

  let angle = -Math.PI / 2
  const slices = rows.map((row) => {
    const sweep = (row.value / total) * Math.PI * 2
    const start = angle
    const end = angle + Math.min(sweep, Math.PI * 2 - 1e-6)
    angle += sweep
    const large = end - start > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const ix1 = cx + inner * Math.cos(end)
    const iy1 = cy + inner * Math.sin(end)
    const ix2 = cx + inner * Math.cos(start)
    const iy2 = cy + inner * Math.sin(start)
    const d =
      rows.length === 1
        ? [
            `M ${cx} ${cy - r}`,
            `A ${r} ${r} 0 1 1 ${cx} ${cy + r}`,
            `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
            `M ${cx} ${cy - inner}`,
            `A ${inner} ${inner} 0 1 0 ${cx} ${cy + inner}`,
            `A ${inner} ${inner} 0 1 0 ${cx} ${cy - inner}`,
          ].join(" ")
        : [
            `M ${x1} ${y1}`,
            `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
            `L ${ix1} ${iy1}`,
            `A ${inner} ${inner} 0 ${large} 0 ${ix2} ${iy2}`,
            "Z",
          ].join(" ")
    return { ...row, d, percent: Math.round((row.value / total) * 100) }
  })

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
          {slices.map((slice) => (
            <path key={slice.id} d={slice.d} fill={slice.color}>
              <title>{`${slice.label}: ${formatValue(slice.value)} (${slice.percent}%)`}</title>
            </path>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Total
          </p>
          <p className="text-sm font-semibold text-slate-900">{formatValue(total)}</p>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              <span className="truncate capitalize">{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-600">
              {formatValue(slice.value)} · {slice.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ReportChartCard(props) {
  return <ChartCard {...props} />
}

export { ChartCard, PALETTE, colorAt }
