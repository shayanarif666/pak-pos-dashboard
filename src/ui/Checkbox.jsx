export function Checkbox({ label, className = "", ...props }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 text-sm text-slate-800 ${className}`}>
      <span className="relative flex h-5 w-5 items-center justify-center">
        <input
          type="checkbox"
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 bg-white checked:border-brand-300 checked:bg-brand-700"
          {...props}
        />
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M3 8.5 6.2 12 13 4.5" />
        </svg>
      </span>
      <span>{label}</span>
    </label>
  )
}
