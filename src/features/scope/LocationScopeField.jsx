import { MapPin } from "lucide-react"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Pill } from "../../ui/Pill.jsx"

function ScopeOption({ checked, title, hint, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={[
        "rounded-xl border px-3 py-2.5 text-left transition",
        checked
          ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
          : "border-slate-200 bg-white hover:border-brand-300",
      ].join(" ")}
    >
      <span className="block text-sm font-semibold text-slate-900">{title}</span>
      <span className="block text-xs text-slate-500">{hint}</span>
    </button>
  )
}

/** The body fields for a scope: location_ids only when "selected". */
export function scopePayload(value) {
  const scope = value.location_scope || "all"
  return { location_scope: scope, location_ids: scope === "selected" ? value.location_ids || [] : [] }
}

/**
 * Store admin picker: all locations, or specific ones. value = { location_scope, location_ids };
 * onChange gets the next value.
 */
export function LocationScopeField({ title, value, onChange, locations, allHint = "Every location, including new ones" }) {
  const ids = value.location_ids || []
  const toggle = (id, checked) =>
    onChange({
      ...value,
      location_ids: checked ? [...new Set([...ids, id])] : ids.filter((current) => current !== id),
    })

  return (
    <fieldset className="rounded-2xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-700">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <ScopeOption
          checked={value.location_scope !== "selected"}
          title="All locations"
          hint={allHint}
          onSelect={() => onChange({ ...value, location_scope: "all" })}
        />
        <ScopeOption
          checked={value.location_scope === "selected"}
          title="Specific locations"
          hint="One location or a few"
          onSelect={() => onChange({ ...value, location_scope: "selected" })}
        />
      </div>
      {value.location_scope === "selected" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {locations.map((row) => (
            <Checkbox
              key={row.id}
              label={row.name}
              checked={ids.includes(row.id)}
              onChange={(e) => toggle(row.id, e.target.checked)}
            />
          ))}
          {!locations.length ? <p className="text-sm text-slate-500">No active locations yet.</p> : null}
          <p className="text-xs text-slate-500 sm:col-span-2">
            {ids.length} of {locations.length} selected
          </p>
        </div>
      ) : null}
    </fieldset>
  )
}

/** "All locations" or one pill per selected location. */
export function LocationScopePills({ row }) {
  if (row?.location_scope !== "selected") {
    return (
      <Pill tone="brand" dot={false}>
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          All locations
        </span>
      </Pill>
    )
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {(row.locations || []).map((location) => (
        <Pill key={location.id} tone="sky" dot={false}>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {location.name}
          </span>
        </Pill>
      ))}
    </span>
  )
}
