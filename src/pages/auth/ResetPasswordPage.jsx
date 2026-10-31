import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, CircleCheck } from "lucide-react"
import { resetPasswordRequest } from "../../api/auth.js"
import { AuthError, AuthLayout, AuthSubmit, PasswordField } from "./AuthLayout.jsx"

/** Opened from the reset email: /reset-password?token=… */
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (password.length < 6) return setError("Use at least 6 characters.")
    if (password !== confirm) return setError("The two passwords do not match.")
    setBusy(true)
    setError("")
    try {
      await resetPasswordRequest({ token, password })
      setDone(true)
    } catch (err) {
      setError(err.message || "Could not reset the password")
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Link not valid" subtitle="This reset link is missing its token. Ask for a new one.">
        <Link
          to="/forgot-password"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800"
        >
          Send a new link
        </Link>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <CircleCheck className="h-6 w-6 text-brand-700" />
          <p className="mt-3 text-sm text-slate-700">
            Your new password is set. For safety you were signed out on every device — sign in again with the new password.
          </p>
        </div>
        <Link
          to="/login"
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800"
        >
          Sign in
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a password you have not used here before. At least 6 characters.">
      <form className="mt-10 space-y-5" onSubmit={submit}>
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} placeholder="New password" />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={6} placeholder="Type it again" />

        {error ? (
          <AuthError>
            {error}
            {/expired|invalid|used/i.test(error) ? (
              <>
                {" "}
                <Link to="/forgot-password" className="font-semibold underline">Send a new link</Link>
              </>
            ) : null}
          </AuthError>
        ) : null}

        <AuthSubmit busy={busy} busyLabel="Saving…">Update password</AuthSubmit>
      </form>
      <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </AuthLayout>
  )
}
