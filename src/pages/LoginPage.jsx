import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { useAuth } from "../auth/AuthContext.jsx"
import { licenseBlockCode } from "../lib/http.js"
import { AuthError, AuthLayout, AuthSubmit, EmailField, PasswordField } from "./auth/AuthLayout.jsx"

// Dashboard sign-in is email + password only. PIN login belongs to the desktop POS,
// where the license key scopes the PIN to one store.
export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
    <AuthLayout title="Welcome back" subtitle="Sign in to your dashboard to continue.">
      <form className="mt-10 space-y-5" onSubmit={onEmailSubmit}>
        <EmailField value={email} onChange={setEmail} />
        <div>
          <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
          <div className="mt-2 flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <AuthError>{error}</AuthError>

        <AuthSubmit busy={busy} busyLabel="Signing in…">
          Sign in
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </AuthSubmit>
      </form>
    </AuthLayout>
  )
}
