import { useEffect, useState } from "react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useSaveTaxRates, useTaxRatesQuery } from "../../features/tax/taxQuery.js"
import { useCurrencyQuery, useSaveCurrency } from "../../features/lists/listQueries.js"
import { useMyStoreQuery } from "../../features/settings/settingsQuery.js"
import { AccountForm } from "../AccountPage.jsx"
import { StoreForm } from "./SettingsPage.jsx"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { formatDate } from "../../ui/format.js"
import { TaxesPage } from "./TaxesPage.jsx"

function Card({ title, description, children }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  )
}

/**
 * Settings › Taxes: the Taxes page taxes (every product or the selected ones), and the store's tax
 * registration (NTN, STRN, FBR invoice) printed on receipts. The old store-wide sales tax and
 * payment-method GST are no longer used (payment surcharges replace the GST).
 */
export function TaxSettingsPage() {
  return (
    <div className="space-y-8">
      <TaxesPage />
      <TaxRegistrationCard />
    </div>
  )
}

/** NTN / STRN / FBR invoice (PUT /tax-rates with only these fields). */
function TaxRegistrationCard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const canEdit = user?.role === "store_admin" || user?.role === "manager"
  const taxQuery = useTaxRatesQuery()
  const saveTax = useSaveTaxRates()
  const [form, setForm] = useState(null)

  useEffect(() => {
    const data = taxQuery.data
    if (!data) return
    setForm({ ntn: data.ntn || "", strn: data.strn || "", fbr_invoice_enabled: Boolean(data.fbr_invoice_enabled) })
  }, [taxQuery.data])

  async function save(event) {
    event.preventDefault()
    try {
      await saveTax.mutateAsync({ ntn: form.ntn.trim() || null, strn: form.strn.trim() || null, fbr_invoice_enabled: form.fbr_invoice_enabled })
      toast("Tax registration saved")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  if (taxQuery.isPending || !form) return <PageLoader label="Loading tax registration…" />
  return (
    <form onSubmit={save}>
      <Card title="Tax registration & FBR" description="Printed on receipts.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="NTN" value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} disabled={!canEdit} />
          <Input label="STRN" value={form.strn} onChange={(e) => setForm({ ...form, strn: e.target.value })} disabled={!canEdit} />
        </div>
        <Checkbox className="mt-4" label="FBR invoice enabled" checked={form.fbr_invoice_enabled} onChange={(e) => setForm({ ...form, fbr_invoice_enabled: e.target.checked })} disabled={!canEdit} />
        {canEdit ? (
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={saveTax.isPending}>{saveTax.isPending ? "Saving…" : "Save tax registration"}</Button>
          </div>
        ) : null}
      </Card>
    </form>
  )
}

export function CurrencySettingsPage() {
  const { toast } = useToast()
  const currencyQuery = useCurrencyQuery()
  const saveCurrency = useSaveCurrency()
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (currencyQuery.data) {
      setForm({ ...currencyQuery.data, decimal_places: String(currencyQuery.data.decimal_places) })
    }
  }, [currencyQuery.data])

  async function save(event) {
    event.preventDefault()
    try {
      await saveCurrency.mutateAsync({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        decimal_places: Number(form.decimal_places),
        symbol_position: form.symbol_position,
      })
      toast("Currency saved")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const sample = form
    ? (() => {
        const amount = (1234.5).toFixed(Number(form.decimal_places) || 0)
        return form.symbol_position === "after" ? `${amount} ${form.symbol}` : `${form.symbol} ${amount}`
      })()
    : ""

  return (
    <section className="space-y-6">
      <PageHeader section="Settings" title="Currency" description="The currency of your sales, receipts and reports. New stores start on PKR." />
      {currencyQuery.isPending || !form ? <PageLoader label="Loading currency…" /> : null}
      {currencyQuery.error ? <p className="text-sm text-rose-700">{currencyQuery.error.message}</p> : null}
      {form ? (
        <form onSubmit={save}>
          <Card title="Store currency" description={`Preview: ${sample}`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Code (ISO, 3 letters)" maxLength={3} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} required />
              <Select label="Decimal places" value={form.decimal_places} onChange={(e) => setForm({ ...form, decimal_places: e.target.value })}>
                {[0, 1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
              <Select label="Symbol position" value={form.symbol_position} onChange={(e) => setForm({ ...form, symbol_position: e.target.value })}>
                <option value="before">Before the amount</option>
                <option value="after">After the amount</option>
              </Select>
            </div>
            <Button type="submit" className="mt-4" disabled={saveCurrency.isPending}>{saveCurrency.isPending ? "Saving…" : "Save currency"}</Button>
          </Card>
        </form>
      ) : null}
    </section>
  )
}

/** Settings › My Account: name, phone, password and PIN of the signed-in user. */
export function AccountSettingsPage() {
  const { user } = useAuth()
  return (
    <section className="space-y-6">
      <PageHeader section="Settings" title="My Account" description={`${user.name} · ${user.email} · ${user.role.replace("_", " ")}`} />
      <AccountForm allowPin />
    </section>
  )
}

/** Settings › Store Information (store admin): the store's profile, status and editable details. */
export function StoreInfoPage() {
  const storeQuery = useMyStoreQuery()
  const store = storeQuery.data?.store || storeQuery.data
  return (
    <section className="space-y-6">
      <PageHeader section="Settings" title="Store Information" description="Your store's profile as customers and receipts see it." />
      {store ? (
        <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5 text-sm sm:grid-cols-4">
          <div><p className="text-slate-500">Store #</p><p className="font-medium text-slate-900">{store.store_number}</p></div>
          <div><p className="text-slate-500">Status</p><StatusBadge value={store.status} /></div>
          <div><p className="text-slate-500">Business type</p><p className="font-medium capitalize text-slate-900">{store.business_type || "—"}</p></div>
          <div><p className="text-slate-500">{store.status === "trial" ? "Trial ends" : "Since"}</p><p className="font-medium text-slate-900">{formatDate(store.status === "trial" ? store.trial_ends_at : store.created_at)}</p></div>
        </div>
      ) : null}
      <StoreForm />
    </section>
  )
}
