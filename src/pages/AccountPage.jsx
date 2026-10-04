import { useState } from "react"
import { useAuth } from "../auth/AuthContext.jsx"
import { useUpdateMe } from "../features/settings/settingsQuery.js"
import { Button } from "../ui/Button.jsx"
import { Input } from "../ui/Input.jsx"
import { useToast } from "../ui/Toast.jsx"

export function AccountPage() {
  const { user } = useAuth()
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Account</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">My account</h1>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
      </div>
      <AccountForm allowPin={user.role !== "superadmin"} />
    </section>
  )
}

export function AccountForm({ allowPin }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const updateMe = useUpdateMe()
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    current_password: "",
    password: "",
    pin: "",
  })

  async function save(event) {
    event.preventDefault()
    const body = { name: form.name.trim(), phone: form.phone.trim() || null }
    if (form.password) {
      body.password = form.password
      body.current_password = form.current_password
    }
    if (allowPin && form.pin) body.pin = form.pin
    try {
      await updateMe.mutateAsync(body)
      setForm({ ...form, current_password: "", password: "", pin: "" })
      toast("Account updated")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <form onSubmit={save} className="max-w-xl rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Current password" type="password" value={form.current_password} required={Boolean(form.password)} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
        <Input label="New password" type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {allowPin ? (
          <Input
            label="New POS PIN (4–6 digits)"
            inputMode="numeric"
            pattern="\d{4,6}"
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          />
        ) : null}
      </div>
      <Button type="submit" className="mt-4" disabled={updateMe.isPending}>Save account</Button>
    </form>
  )
}
