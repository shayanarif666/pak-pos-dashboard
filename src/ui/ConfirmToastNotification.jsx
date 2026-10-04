import { useEffect, useRef, useState } from "react"
import { Button } from "./Button.jsx"

export function ConfirmToastNotification({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  const [mounted, setMounted] = useState(open)
  const [active, setActive] = useState(false)
  const copy = useRef({ title, message, confirmLabel, cancelLabel })

  if (open) {
    copy.current = { title, message, confirmLabel, cancelLabel }
  }

  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = window.requestAnimationFrame(() => setActive(true))
      return () => window.cancelAnimationFrame(frame)
    }
    setActive(false)
    const timer = window.setTimeout(() => setMounted(false), 240)
    return () => window.clearTimeout(timer)
  }, [open])

  if (!mounted) return null

  const body = copy.current

  return (
    <div
      className={[
        "fixed inset-0 z-[90] flex items-center justify-center px-4 transition-all duration-200",
        active ? "bg-slate-900/40 opacity-100" : "bg-slate-900/0 opacity-0",
      ].join(" ")}
    >
      <div
        className={[
          "w-full max-w-md rounded-3xl border border-slate-300 bg-white p-6 shadow-2xl backdrop-blur-2xl transition-all duration-200",
          active ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0",
        ].join(" ")}
      >
        <h2 className="text-lg font-semibold text-slate-900">{body.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{body.message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {body.cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {body.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
