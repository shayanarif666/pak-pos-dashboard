import { useEffect, useRef, useState } from "react"

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
}

/**
 * Animated dialog for add / edit forms. The child (usually a styled <form>) is the visible card.
 * Closes on Escape and on backdrop click; keeps rendering the last children while fading out.
 */
export function Modal({ open, onClose, size = "lg", children, labelledBy }) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const lastChildren = useRef(children)
  if (open) lastChildren.current = children

  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = window.requestAnimationFrame(() => setVisible(true))
      return () => window.cancelAnimationFrame(frame)
    }
    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), 220)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div
      className={[
        "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10 transition-colors duration-200 sm:items-center",
        visible ? "bg-slate-900/45 backdrop-blur-[2px]" : "bg-slate-900/0",
      ].join(" ")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={[
          "w-full transition-all duration-200 ease-out",
          SIZES[size] || SIZES.lg,
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.97] opacity-0",
        ].join(" ")}
      >
        {open ? children : lastChildren.current}
      </div>
    </div>
  )
}

/** Standard modal card: title row with close button, then the body. */
export function ModalCard({ title, onClose, children, as: Tag = "div", className = "", ...props }) {
  return (
    <Tag
      className={`max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ${className}`}
      {...props}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-1.5 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        ) : null}
      </div>
      {children}
    </Tag>
  )
}
