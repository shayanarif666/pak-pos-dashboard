import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useAuth } from "../auth/AuthContext.jsx"
import { licenseBlockCode } from "../lib/http.js"
import { Spinner } from "../ui/Spinner.jsx"

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(19,92,76,0.16),_transparent_60%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-emerald-200/50 blur-3xl" />

      <section className="relative w-full max-w-[420px] rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-8">
        <div className="brand-pattern -mx-6 -mt-6 mb-6 h-4 rounded-t-3xl sm:-mx-8 sm:-mt-8" aria-hidden="true" />
        <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">
          Admin portal
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-slate-900">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Super Admin, Store Admin, and Store Manager
        </p>

        <form className="mt-8 space-y-4" onSubmit={onEmailSubmit}>
          <label className="block text-sm text-slate-700">
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-600"
              placeholder="you@store.com"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Password
            <span className="relative mt-1.5 block">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-600"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 text-slate-500 hover:text-brand-700"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-base font-semibold text-white shadow-[0_8px_20px_rgba(19,92,76,0.25)] transition hover:bg-brand-800 disabled:opacity-60"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={16} className="border-white/40 border-t-white" />
                Signing in…
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {error ? (
          <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  )
}
