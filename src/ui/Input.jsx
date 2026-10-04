import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none placeholder:text-slate-400 transition focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/15 disabled:opacity-50"

export function Input({ label, error, className = "", type = "text", ...props }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === "password"
  const inputType = isPassword ? (showPassword ? "text" : "password") : type

  return (
    <label className={`block text-sm text-slate-700 ${className}`}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span> : null}
      {isPassword ? (
        <span className="relative block">
          <input className={`${fieldClass} pr-12`} type={inputType} {...props} />
          <button
            type="button"
            className="absolute inset-y-0 right-3 text-slate-500 transition hover:text-brand-700"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      ) : (
        <input className={fieldClass} type={inputType} {...props} />
      )}
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : null}
    </label>
  )
}

export function Textarea({ label, error, className = "", ...props }) {
  return (
    <label className={`block text-sm text-slate-700 ${className}`}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span> : null}
      <textarea className={`${fieldClass} min-h-24 resize-y`} {...props} />
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : null}
    </label>
  )
}
