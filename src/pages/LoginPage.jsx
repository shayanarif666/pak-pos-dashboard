import { useState } from "react"
import { ArrowRight, BarChart3, Boxes, Eye, EyeOff, Lock, Mail, MapPin, Store } from "lucide-react"
import { useAuth } from "../auth/AuthContext.jsx"
import { licenseBlockCode } from "../lib/http.js"
import { Spinner } from "../ui/Spinner.jsx"

const FIELD =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-700 focus:bg-white focus:ring-4 focus:ring-brand-700/10"

const FEATURES = [
  { icon: BarChart3, title: "Live reports", text: "Sales, profit and tax by day, month or year." },
  { icon: Boxes, title: "Catalog & stock", text: "Products, offers and stock at every location." },
  { icon: MapPin, title: "Every branch", text: "Staff, devices and sessions per location." },
]

// Dashboard sign-in is email + password only. PIN login belongs to the desktop POS,
// where the license key scopes the PIN to one store.
export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function onEmailSubmit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    try {
      await signIn({ email: email.trim(), password, channel: "web" })
    } catch (err) {
      // Expired / suspended license is shown in the blocking license alert instead.
      if (!licenseBlockCode(err)) setError(err.message || "Login failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel (large screens). */}
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
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/50">© {new Date().getFullYear()} All rights reserved.</p>
      </aside>

      {/* Sign-in form. */}
      <main className="relative flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-50 to-transparent lg:hidden" />
        <section className="relative w-full max-w-[400px]">
          <span className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-[0_10px_30px_rgba(19,92,76,0.35)] lg:hidden">
            <Store className="h-6 w-6" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your dashboard to continue.</p>

          <form className="mt-10 space-y-5" onSubmit={onEmailSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <span className="relative mt-2 block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`${FIELD} pl-11`}
                  placeholder="you@store.com"
                />
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <span className="relative mt-2 block">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${FIELD} pl-11 pr-12`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center px-1 text-slate-400 hover:text-brand-700"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-base font-semibold text-white shadow-[0_10px_30px_rgba(19,92,76,0.28)] transition hover:bg-brand-800 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Spinner size={16} className="border-white/40 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
