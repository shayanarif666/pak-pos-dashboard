import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, MailCheck, Store } from "lucide-react"
import { forgotPasswordRequest } from "../../api/auth.js"
import { AUTH_FIELD, AuthError, AuthLayout, AuthSubmit, EmailField } from "./AuthLayout.jsx"

const backToLogin = (
  <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700">
    <ArrowLeft className="h-4 w-4" />
    Back to sign in
  </Link>
)

/** Asks for the email; the server always answers the same, so it never reveals who has an account. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [storeSlug, setStoreSlug] = useState("")
  // The same email can belong to several stores; the server then asks which one.
  const [needsStore, setNeedsStore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    try {
      await forgotPasswordRequest({ email: email.trim(), ...(storeSlug.trim() ? { store_slug: storeSlug.trim() } : {}) })
      setSent(true)
    } catch (err) {
      if (/store_slug/i.test(err.message || "")) {
        setNeedsStore(true)
        setError("This email is used in more than one store. Enter your store's short name to continue.")
      } else {
        setError(err.message || "Could not send the reset link")
      }
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <MailCheck className="h-6 w-6 text-brand-700" />
          <p className="mt-3 text-sm text-slate-700">
            If <span className="font-semibold text-slate-900">{email.trim()}</span> has an account, a link to reset the password
            is on its way. It works once and expires in 1 hour.
          </p>
          <p className="mt-3 text-sm text-slate-500">No email after a few minutes? Check spam, or send it again.</p>
        </div>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 h-12 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:border-brand-700 hover:text-brand-700"
        >
          Send again
        </button>
        {backToLogin}
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter the email you sign in with and we'll send you a link to set a new password.">
      <form className="mt-10 space-y-5" onSubmit={submit}>
        <EmailField value={email} onChange={setEmail} />
        {needsStore ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Store short name</span>
            <span className="relative mt-2 block">
              <Store className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                required
                value={storeSlug}
                onChange={(event) => setStoreSlug(event.target.value)}
                className={`${AUTH_FIELD} pl-11`}
                placeholder="e.g. acadex"
              />
            </span>
          </label>
        ) : null}

        <AuthError>{error}</AuthError>

        <AuthSubmit busy={busy} busyLabel="Sending…">Send reset link</AuthSubmit>
      </form>
      {backToLogin}
    </AuthLayout>
  )
}
