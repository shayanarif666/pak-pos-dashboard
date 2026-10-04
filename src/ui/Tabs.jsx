import { useSearchParams } from "react-router-dom"

/** Selected tab lives in ?tab= so it survives reloads and can be linked to. */
export function useTabParam(tabs, fallback = tabs[0]?.[0]) {
  const [params, setParams] = useSearchParams()
  const current = params.get("tab")
  const value = tabs.some(([key]) => key === current) ? current : fallback
  function setValue(next) {
    const copy = new URLSearchParams(params)
    copy.set("tab", next)
    setParams(copy, { replace: true })
  }
  return [value, setValue]
}

export function Tabs({ tabs, value, onChange, className = "" }) {
  return (
    <div
      role="tablist"
      className={`flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 ${className}`}
    >
      {tabs.map(([key, label]) => {
        const active = key === value
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
              active
                ? "bg-brand-700 text-white shadow-[0_6px_16px_rgba(19,92,76,0.25)]"
                : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
            ].join(" ")}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
