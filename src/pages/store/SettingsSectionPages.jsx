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

const METHODS = [
  ["cash", "Cash"],
  ["card", "Card"],
  ["jazzcash", "JazzCash"],
  ["easypaisa", "EasyPaisa"],
]

function Card({ title, description, children }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  )
}

/** Settings › Taxes: sales tax, payment-method GST and the master switch (PUT /tax-rates). */
export function TaxSettingsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const canEdit = user?.role === "store_admin" || user?.role === "manager"
  const taxQuery = useTaxRatesQuery()
  const saveTax = useSaveTaxRates()
  const [form, setForm] = useState(null)

  useEffect(() => {
    const data = taxQuery.data
    if (!data) return
    const rates = Object.fromEntries((data.rates || []).map((row) => [row.payment_method, String(Number(row.gst_percent))]))
    setForm({
      ntn: data.ntn || "",
      strn: data.strn || "",
      charge_tax_on_sales: Boolean(data.charge_tax_on_sales),
      sales_tax_enabled: data.sales_tax_enabled !== false,
      sales_tax_rate: data.sales_tax_rate == null ? "18" : String(Number(data.sales_tax_rate)),
      payment_tax_enabled: data.payment_tax_enabled !== false,
      fbr_invoice_enabled: Boolean(data.fbr_invoice_enabled),
      rates: Object.fromEntries(METHODS.map(([method]) => [method, rates[method] ?? "0"])),
    })
  }, [taxQuery.data])

  async function save(event) {
    event.preventDefault()
    try {
      await saveTax.mutateAsync({
        ntn: form.ntn.trim() || null,
        strn: form.strn.trim() || null,
        charge_tax_on_sales: form.charge_tax_on_sales,
        sales_tax_enabled: form.sales_tax_enabled,
        sales_tax_rate: Number(form.sales_tax_rate || 0),
        payment_tax_enabled: form.payment_tax_enabled,
        fbr_invoice_enabled: form.fbr_invoice_enabled,
        rates: METHODS.map(([method]) => ({ payment_method: method, gst_percent: Number(form.rates[method] || 0) })),
      })
      toast("Tax settings saved")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  return (
    <section className="space-y-6">
      <PageHeader
        section="Settings"
        title="Taxes"
        description="Each tax is worked out on the line amount after discounts: product taxes (set on each product), the category tax (on each category), the store's sales tax, and GST on the payment method."
      />
      {taxQuery.isPending || !form ? <PageLoader label="Loading taxes…" /> : null}
      {taxQuery.error ? <p className="text-sm text-rose-700">{taxQuery.error.message}</p> : null}
      {form ? (
        <form onSubmit={save} className="grid gap-5">
          <Card title="Tax on sales" description="The master switch: when off, no tax of any kind is added to sales.">
            <Checkbox label="Charge tax on sales" checked={form.charge_tax_on_sales} onChange={(e) => set({ charge_tax_on_sales: e.target.checked })} disabled={!canEdit} />
          </Card>
          <Card title="Sales tax" description="One store-wide rate added to every taxable line. Switch it off when each product carries its own sales tax.">
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-4">
              <Checkbox label="Sales tax on" checked={form.sales_tax_enabled} onChange={(e) => set({ sales_tax_enabled: e.target.checked })} disabled={!canEdit} />
              <Input label="Sales tax %" type="number" min="0" max="100" step="0.01" value={form.sales_tax_rate} onChange={(e) => set({ sales_tax_rate: e.target.value })} disabled={!canEdit || !form.sales_tax_enabled} />
            </div>
          </Card>
          <Card title="Payment method tax (GST)" description="Added on top of the bill for the payment method used; a mixed payment pays each method's rate on its share.">
            <Checkbox label="Payment method tax on" checked={form.payment_tax_enabled} onChange={(e) => set({ payment_tax_enabled: e.target.checked })} disabled={!canEdit} />
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {METHODS.map(([method, text]) => (
                <Input
                  key={method}
                  label={`${text} %`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.rates[method]}
                  onChange={(e) => set({ rates: { ...form.rates, [method]: e.target.value } })}
                  disabled={!canEdit || !form.payment_tax_enabled}
                />
              ))}
            </div>
          </Card>
          <Card title="Tax registration & FBR">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="NTN" value={form.ntn} onChange={(e) => set({ ntn: e.target.value })} disabled={!canEdit} />
              <Input label="STRN" value={form.strn} onChange={(e) => set({ strn: e.target.value })} disabled={!canEdit} />
            </div>
            <Checkbox className="mt-4" label="FBR invoice enabled" checked={form.fbr_invoice_enabled} onChange={(e) => set({ fbr_invoice_enabled: e.target.checked })} disabled={!canEdit} />
          </Card>
          {canEdit ? (
            <div>
              <Button type="submit" disabled={saveTax.isPending}>{saveTax.isPending ? "Saving…" : "Save tax settings"}</Button>
            </div>
          ) : null}
        </form>
      ) : null}
    </section>
  )
}

/** Settings › Currency (GET / PUT /currency). */
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
