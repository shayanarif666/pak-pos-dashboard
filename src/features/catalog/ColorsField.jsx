import { useState } from "react"
import { Plus, X } from "lucide-react"

const HEX = /^#[0-9A-F]{6}$/

/**
 * The colours a product / variant comes in: pick one on the colour wheel (or type its code), Add,
 * and repeat for as many as needed. value = ["#E11D48", "#2563EB"].
 */
export function ColorsField({ value = [], onChange, label = "Colors" }) {
  const [picked, setPicked] = useState("#E11D48")
  const [text, setText] = useState("#E11D48")
  const code = text.trim().toUpperCase().replace(/^([^#])/, "#$1")
  const valid = HEX.test(code)
  const already = value.includes(code)

  const add = () => {
    if (!valid || already) return
    onChange([...value, code])
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200" title="Pick a colour">
          <span className="absolute inset-0" style={{ background: valid ? code : picked }} />
          <input
            type="color"
            value={picked}
            onChange={(e) => {
              setPicked(e.target.value)
              setText(e.target.value.toUpperCase())
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Colour wheel"
          />
        </label>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            const next = e.target.value.trim().toUpperCase().replace(/^([^#])/, "#$1")
            if (HEX.test(next)) setPicked(next.toLowerCase())
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          maxLength={7}
          className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm uppercase text-slate-900 outline-none focus:border-brand-700"
          aria-label="Colour code"
        />
        <button
          type="button"
          onClick={add}
          disabled={!valid || already}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {already ? "Added" : "Add color"}
        </button>
      </div>
      {value.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((hex) => (
            <span key={hex} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-xs font-medium text-slate-700">
              <span className="h-5 w-5 rounded-full border border-slate-200" style={{ background: hex }} />
              <span className="font-mono">{hex}</span>
              <button type="button" aria-label={`Remove ${hex}`} onClick={() => onChange(value.filter((row) => row !== hex))} className="text-slate-400 hover:text-rose-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No colours yet. Pick one on the wheel and press Add color — add as many as you like.</p>
      )}
    </div>
  )
}

/** Read-only colour dots, e.g. on the detail page. */
export function ColorSwatches({ colors = [], empty = "—" }) {
  if (!colors?.length) return <span className="text-slate-400">{empty}</span>
  return (
    <span className="inline-flex flex-wrap justify-end gap-1.5">
      {colors.map((hex) => (
        <span key={hex} title={hex} className="h-5 w-5 rounded-full border border-slate-200" style={{ background: hex }} />
      ))}
    </span>
  )
}
