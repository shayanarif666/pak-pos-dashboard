import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"

const STYLES = {
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "text-emerald-700",
    Icon: CheckCircle2,
  },
  error: {
    wrap: "border-rose-200 bg-rose-50 text-rose-700",
    icon: "text-rose-700",
    Icon: AlertCircle,
  },
  info: {
    wrap: "border-brand-300 bg-brand-50 text-brand-700",
    icon: "text-brand-700",
    Icon: Info,
  },
}

export function ToastMessage({ message, type = "success", onDismiss }) {
  const style = STYLES[type] || STYLES.success
  const Icon = style.Icon

  return (
    <div
      className={[
        "toast-enter pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl",
        style.wrap,
      ].join(" ")}
      role="status"
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />
      <p className="flex-1 leading-5">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
