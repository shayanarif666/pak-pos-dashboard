const variants = {
  primary:
    "bg-brand-700 text-white shadow-[0_8px_20px_rgba(19,92,76,0.25)] hover:bg-brand-800 disabled:bg-brand-300 disabled:shadow-none",
  ghost:
    "border border-brand-200 bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50",
  danger:
    "bg-rose-600 text-white shadow-[0_8px_20px_rgba(225,29,72,0.2)] hover:bg-rose-700 disabled:opacity-50",
  icon: "rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 backdrop-blur hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50",
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 active:scale-[0.98]",
        variants[variant] || variants.primary,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  )
}
