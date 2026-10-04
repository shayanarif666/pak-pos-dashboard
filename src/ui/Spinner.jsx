export function Spinner({ size = 22, className = "" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-slate-300 border-t-brand-700 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-slate-600">
      <Spinner size={32} />
      <p>{label}</p>
    </div>
  )
}
