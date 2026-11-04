import { useState } from "react"
import { PageHeader } from "../ui/PageHeader.jsx"
import { useAuth } from "../auth/AuthContext.jsx"
import { useUpdateMe } from "../features/settings/settingsQuery.js"
import { Button } from "../ui/Button.jsx"
import { Input } from "../ui/Input.jsx"
import { useToast } from "../ui/Toast.jsx"

export function AccountPage() {
  const { user } = useAuth()
  return (
    <section className="space-y-6">
      <PageHeader
        section="Account"
        title="My account"
        description={user.email}
      />
      <AccountForm allowPin={user.role !== "superadmin"} />
    </section>
  )
}

export function AccountForm({ allowPin, plain = false }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const updateMe = useUpdateMe()
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    pin: "",
  })

  async function save(event) {
    event.preventDefault()
    const body = { name: form.name.trim(), phone: form.phone.trim() || null }
    if (allowPin && form.pin) body.pin = form.pin
    try {
      await updateMe.mutateAsync(body)
      setForm({ ...form, pin: "" })
      toast("Account updated")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <form onSubmit={save} className={plain ? "" : "rounded-[28px] border border-slate-200 bg-white p-5"}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
