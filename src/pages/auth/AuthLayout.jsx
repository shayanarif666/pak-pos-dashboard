import { useState } from "react"
import { BarChart3, Boxes, Eye, EyeOff, Lock, Mail, MapPin, Store } from "lucide-react"
import { Spinner } from "../../ui/Spinner.jsx"

export const AUTH_FIELD =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-700 focus:bg-white focus:ring-4 focus:ring-brand-700/10"

const FEATURES = [
  { icon: BarChart3, title: "Live reports", text: "Sales, profit and tax by day, month or year." },
  { icon: Boxes, title: "Catalog & stock", text: "Products, discounts and stock at every location." },
  { icon: MapPin, title: "Every branch", text: "Staff, devices and sessions per location." },
]

/** Sign-in / forgot / reset pages: the green brand panel on large screens, the form on the right. */
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="brand-pattern relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Store className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Point of Sale</span>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight">Run every branch from one place.</h2>
          <p className="mt-4 max-w-md text-base text-white/70">
            Sales, stock, staff and reports for all your locations — live from the till.
          </p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, title: name, text }) => (
              <li key={name} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{name}</span>
                  <span className="block text-sm text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/50">© {new Date().getFullYear()} All rights reserved.</p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-50 to-transparent lg:hidden" />
        <section className="relative w-full max-w-[400px]">
          <span className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-[0_10px_30px_rgba(19,92,76,0.35)] lg:hidden">
            <Store className="h-6 w-6" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
          {children}
        </section>
      </main>
    </div>
  )
}

/** Full-width green submit button with a busy state. */
export function AuthSubmit({ busy, busyLabel, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-base font-semibold text-white shadow-[0_10px_30px_rgba(19,92,76,0.28)] transition hover:bg-brand-800 disabled:opacity-60"
    >
      {busy ? (
        <>
          <Spinner size={16} className="border-white/40 border-t-white" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function AuthError({ children }) {
  if (!children) return null
  return <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{children}</p>
}

/** Password input with a lock icon and a show / hide button. */
export function PasswordField({ label, value, onChange, autoComplete, placeholder = "Enter your password", minLength }) {
  const [show, setShow] = useState(false)
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="relative mt-2 block">
        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${AUTH_FIELD} pl-11 pr-12`}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-3 flex items-center px-1 text-slate-400 hover:text-brand-700"
          onClick={() => setShow((current) => !current)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  )
}

/** Email input with a mail icon. */
export function EmailField({ value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Email</span>
      <span className="relative mt-2 block">
        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${AUTH_FIELD} pl-11`}
          placeholder="you@store.com"
        />
      </span>
    </label>
  )
}
