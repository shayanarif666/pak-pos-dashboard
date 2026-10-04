import { useEffect, useState } from "react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useMyStoreQuery, useUpdateMyStore } from "../../features/settings/settingsQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { AccountForm } from "../AccountPage.jsx"
import { Tabs, useTabParam } from "../../ui/Tabs.jsx"
import { WebsitePage } from "./WebsitePage.jsx"

const TABS = [
  ["store", "Store"],
  ["website", "Website"],
  ["account", "My account"],
]

const FIELDS = [
  ["name", "Store name"],
  ["legal_name", "Legal name"],
  ["owner_name", "Owner name"],
  ["contact_email", "Contact email"],
  ["contact_phone", "Contact phone"],
  ["city", "City"],
  ["address", "Address"],
  ["logo_url", "Logo URL"],
  ["favicon_url", "Favicon URL"],
  ["timezone", "Timezone"],
]

export function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useTabParam(TABS)
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Store profile, online storefront and your own account.</p>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "store" ? <StoreForm /> : null}
      {tab === "website" ? <WebsitePage embedded /> : null}
      {tab === "account" ? <AccountForm allowPin={user.role !== "superadmin"} /> : null}
    </section>
  )
}

function StoreForm() {
  const { toast } = useToast()
  const storeQuery = useMyStoreQuery()
  const updateStore = useUpdateMyStore()
  const [form, setForm] = useState(null)

  useEffect(() => {
    const store = storeQuery.data?.store || storeQuery.data
    if (!store) return
    setForm({
      ...Object.fromEntries(FIELDS.map(([key]) => [key, store[key] ?? ""])),
      receipt_footer: store.receipt_footer ?? "",
      expiry_warning_days: store.expiry_warning_days ?? 30,
      expiry_critical_days: store.expiry_critical_days ?? 7,
    })
  }, [storeQuery.data])

  async function save(event) {
    event.preventDefault()
    const body = {}
    for (const [key] of FIELDS) body[key] = String(form[key] || "").trim() || null
    body.receipt_footer = form.receipt_footer || null
    body.expiry_warning_days = Number(form.expiry_warning_days)
    body.expiry_critical_days = Number(form.expiry_critical_days)
    try {
      await updateStore.mutateAsync(body)
      toast("Store settings saved")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  if (storeQuery.isPending || !form) return <PageLoader label="Loading store…" />
  if (storeQuery.error) return <p className="text-sm text-rose-700">{storeQuery.error.message}</p>

  return (
    <form onSubmit={save} className="max-w-3xl rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(([key, label]) => (
          <Input key={key} label={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        ))}
        <Input label="Expiry warning (days)" type="number" min="0" value={form.expiry_warning_days} onChange={(e) => setForm({ ...form, expiry_warning_days: e.target.value })} />
        <Input label="Expiry critical (days)" type="number" min="0" value={form.expiry_critical_days} onChange={(e) => setForm({ ...form, expiry_critical_days: e.target.value })} />
      </div>
      <Textarea className="mt-3" label="Receipt footer" value={form.receipt_footer} onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })} />
      <Button type="submit" className="mt-4" disabled={updateStore.isPending}>Save settings</Button>
    </form>
  )
}
