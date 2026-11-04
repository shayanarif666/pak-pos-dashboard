import { useEffect, useState } from "react"
import { Check, ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { Spinner } from "../../ui/Spinner.jsx"
import {
  BILLING_STATUSES,
  BUSINESS_TYPES,
  STORE_EDIT_STEPS,
  STORE_STATUSES,
  STORE_STEPS,
  TAX_RATE_METHODS,
} from "./storeForm.js"

function FieldGrid({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function Note({ children }) {
  return (
    <p className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
      {children}
    </p>
  )
}

function ToggleCard({ label, hint, checked, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
      <Checkbox label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {hint ? <p className="mt-1.5 pl-8 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

/** Logo / favicon: a picked file (uploaded as multipart) or the current URL. */
function ImageField({ label, file, url, onFile, onClear }) {
  const [preview, setPreview] = useState("")
  useEffect(() => {
    if (!file) {
      setPreview("")
      return undefined
    }
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  const shown = preview || url

  return (
    <div className="text-sm">
      <span className="mb-1.5 block font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {shown ? <img src={shown} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-slate-400" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-slate-600">{file ? file.name : url ? "Current image" : "No image"}</span>
        <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700">
          Choose
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const picked = event.target.files?.[0]
              if (picked) onFile(picked)
              event.target.value = ""
            }}
          />
        </label>
        {shown ? (
          <Button variant="icon" type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function StoreStepper({
  mode,
  form,
  onChange,
  plans,
  submitting,
  error,
  onSubmit,
}) {
  const [step, setStep] = useState(0)
  const isEdit = mode === "edit"
  const steps = isEdit ? STORE_EDIT_STEPS : STORE_STEPS
  const current = steps[step]
  const progress = ((step + 1) / steps.length) * 100

  function setField(key, value) {
    onChange({ ...form, [key]: value })
  }

  function setFields(fields) {
    onChange({ ...form, ...fields })
  }

  function next() {
    if (current === "Location") {
      onChange({
        ...form,
        admin_email: form.admin_email.trim() || form.contact_email.trim(),
        admin_phone: form.admin_phone.trim() || form.contact_phone.trim(),
        admin_name: form.admin_name.trim() || form.owner_name.trim(),
      })
    }
    setStep((value) => Math.min(steps.length - 1, value + 1))
  }

  function back() {
    setStep((value) => Math.max(0, value - 1))
  }

  function stepValid() {
    if (current === "Store information") {
      return (
        form.plan_id &&
        form.name.trim() &&
        form.address.trim() &&
        form.contact_email.trim() &&
        form.contact_phone.trim()
      )
    }
    if (current === "Location") return form.location_name.trim()
    if (current === "Store Admin") {
      return (
        form.admin_name.trim() &&
        form.admin_email.trim() &&
        /^\d{4,6}$/.test(form.admin_pin.trim()) &&
        (isEdit ? !form.admin_password || form.admin_password.length >= 6 : form.admin_password.length >= 6)
      )
    }
    if (current === "Store Manager") {
      // Optional on edit: leave it empty when the store has no manager yet.
      if (!form.manager_name.trim() && !form.manager_email.trim()) return true
      return form.manager_name.trim() && form.manager_email.trim() && /^\d{4,6}$/.test(form.manager_pin.trim())
    }
    if (current === "Tax") {
      const rate = form.sales_tax_rate
      return rate === "" || (Number(rate) >= 0 && Number(rate) <= 100)
    }
    return true
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (!stepValid()) return
        if (step < steps.length - 1) {
          next()
          return
        }
        onSubmit()
      }}
    >
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
              Step {step + 1} of {steps.length}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{current}</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-brand-50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 via-violet-400 to-fuchsia-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((label, index) => {
            const done = index < step
            const active = index === step
            return (
              <li key={label} className="flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className={[
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition",
                    done
                      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                      : active
                        ? "border-brand-300 bg-brand-100 text-slate-900 shadow-[0_0_24px_rgba(56,189,248,0.35)]"
                        : "border-slate-200 bg-slate-100 text-slate-500 hover:text-brand-700",
                  ].join(" ")}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </button>
                <span
                  className={[
                    "mt-2 hidden text-xs font-medium leading-tight sm:block",
                    active ? "text-slate-900" : "text-slate-500",
                  ].join(" ")}
                >
                  {label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-white to-brand-50/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
        {current === "Store information" ? (
          <FieldGrid>
            <Select
              label="Plan"
              required
              value={form.plan_id}
              onChange={(event) => setField("plan_id", event.target.value)}
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.code}) — {plan.price_pkr}
                </option>
              ))}
            </Select>
            {isEdit ? null : (
              <Select
                label="Status"
                value={form.status}
                onChange={(event) => setField("status", event.target.value)}
              >
                {STORE_STATUSES.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Select>
            )}
            <Input
              label="Store name"
              required
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
            />
            <Input
              label="Legal name"
              value={form.legal_name}
              onChange={(event) => setField("legal_name", event.target.value)}
            />
            <Input
              label="Owner name"
              placeholder="Defaults to the store admin's name"
              value={form.owner_name}
              onChange={(event) => setField("owner_name", event.target.value)}
            />
            <Select
              label="Business type"
              value={form.business_type}
              onChange={(event) => setField("business_type", event.target.value)}
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Input
              label="Custom domain (optional)"
              placeholder="www.shop.com"
              value={form.domain}
              onChange={(event) => setField("domain", event.target.value)}
            />
            <Input
              label="City"
              value={form.city}
              onChange={(event) => setField("city", event.target.value)}
            />
            <Input
              label="Contact email"
              type="email"
              required
              value={form.contact_email}
              onChange={(event) => setField("contact_email", event.target.value)}
            />
            <Input
              label="Contact phone"
              required
              value={form.contact_phone}
              onChange={(event) => setField("contact_phone", event.target.value)}
            />
            <Input
              className="sm:col-span-2"
              label="Address"
              required
              value={form.address}
              onChange={(event) => setField("address", event.target.value)}
            />
            <ImageField
              label="Logo"
              file={form.logo_file}
              url={form.logo_url}
              onFile={(file) => setField("logo_file", file)}
              onClear={() => setFields({ logo_file: null, logo_url: "" })}
            />
            <ImageField
              label="Favicon"
              file={form.favicon_file}
              url={form.favicon_url}
              onFile={(file) => setField("favicon_file", file)}
              onClear={() => setFields({ favicon_file: null, favicon_url: "" })}
            />
          </FieldGrid>
        ) : null}

        {current === "Location" ? (
          <FieldGrid>
            <Input
              label="Location name"
              required
              value={form.location_name}
              onChange={(event) => setField("location_name", event.target.value)}
              placeholder="e.g. Main branch"
            />
            <Input
              label="Location city"
              placeholder={form.city || "Same as store"}
              value={form.location_city}
              onChange={(event) => setField("location_city", event.target.value)}
            />
            <Input
              label="Location phone"
              placeholder={form.contact_phone || "Same as store"}
              value={form.location_phone}
              onChange={(event) => setField("location_phone", event.target.value)}
            />
            <Input
              className="sm:col-span-2"
              label="Location address"
              placeholder={form.address || "Same as store"}
              value={form.location_address}
              onChange={(event) => setField("location_address", event.target.value)}
            />
            <Note>Left blank, the location takes the store's city, phone and address.</Note>
          </FieldGrid>
        ) : null}

        {current === "Store Admin" ? (
          <FieldGrid>
            <Input
              label="Admin name"
              required
              value={form.admin_name}
              onChange={(event) => setField("admin_name", event.target.value)}
            />
            <Input
              label="Admin email"
              type="email"
              required
              value={form.admin_email}
              onChange={(event) => setField("admin_email", event.target.value)}
            />
            <Input
              label="Admin phone"
              value={form.admin_phone}
              onChange={(event) => setField("admin_phone", event.target.value)}
            />
            <Input
              label={isEdit ? "Admin password (leave blank to keep)" : "Admin password (min 6)"}
              type="password"
              required={!isEdit}
              minLength={6}
              value={form.admin_password}
              onChange={(event) => setField("admin_password", event.target.value)}
            />
            <Input
              label="Admin PIN (4–6 digits)"
              required
              inputMode="numeric"
              maxLength={6}
              value={form.admin_pin}
              onChange={(event) => setField("admin_pin", event.target.value.replace(/\D/g, ""))}
            />
            {isEdit ? null : <Note>No manager at registration: the store admin adds managers later under Staff.</Note>}
          </FieldGrid>
        ) : null}

        {current === "Store Manager" ? (
          <FieldGrid>
            <Input
              label="Manager name"
              value={form.manager_name}
              onChange={(event) => setField("manager_name", event.target.value)}
            />
            <Input
              label="Manager email"
              type="email"
              value={form.manager_email}
              onChange={(event) => setField("manager_email", event.target.value)}
            />
            <Input
              label="Manager phone"
              value={form.manager_phone}
              onChange={(event) => setField("manager_phone", event.target.value)}
            />
            <Input
              label="Manager password (leave blank to keep)"
              type="password"
              value={form.manager_password}
              onChange={(event) => setField("manager_password", event.target.value)}
            />
            <Input
              label="Manager PIN"
              inputMode="numeric"
              maxLength={6}
              value={form.manager_pin}
              onChange={(event) => setField("manager_pin", event.target.value.replace(/\D/g, ""))}
            />
            <Note>Optional: leave it empty when the store has no manager.</Note>
          </FieldGrid>
        ) : null}

        {current === "Billing" ? (
          <FieldGrid>
            <Select
              label="Billing status"
              value={form.billing_status}
              onChange={(event) => setField("billing_status", event.target.value)}
            >
              {BILLING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setField("amount", event.target.value)}
            />
            <Input
              className="sm:col-span-2"
              label="Method"
              placeholder="Easypaisa, JazzCash, bank transfer…"
              value={form.method_note}
              onChange={(event) => setField("method_note", event.target.value)}
            />
            <Textarea
              className="sm:col-span-2"
              label="Billing note"
              placeholder="Anything to remember about this payment"
              value={form.billing_note}
              onChange={(event) => setField("billing_note", event.target.value)}
            />
          </FieldGrid>
        ) : null}

        {current === "Tax" ? (
          <div className="space-y-5">
            <FieldGrid>
              <Input
                label="NTN"
                placeholder="1234567-8"
                value={form.ntn}
                onChange={(event) => setField("ntn", event.target.value)}
              />
              <Input
                label="STRN"
                placeholder="3277876123456"
                value={form.strn}
                onChange={(event) => setField("strn", event.target.value)}
              />
            </FieldGrid>
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleCard
                label="Charge tax on sales"
                checked={form.charge_tax_on_sales}
                onChange={(value) => setField("charge_tax_on_sales", value)}
              />
              <ToggleCard
                label="FBR invoice"
                hint="Print the FBR invoice number on receipts."
                checked={form.fbr_invoice_enabled}
                onChange={(value) => setField("fbr_invoice_enabled", value)}
              />
              <ToggleCard
                label="Sales tax"
                checked={form.sales_tax_enabled}
                onChange={(value) => setField("sales_tax_enabled", value)}
              />
              <Input
                label="Sales tax rate %"
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={!form.sales_tax_enabled}
                value={form.sales_tax_rate}
                onChange={(event) => setField("sales_tax_rate", event.target.value)}
              />
              <ToggleCard
                label="Payment-method GST"
                checked={form.payment_tax_enabled}
                onChange={(value) => setField("payment_tax_enabled", value)}
              />
            </div>
            {form.payment_tax_enabled ? (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-600">GST % by payment method (blank = not sent)</p>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {TAX_RATE_METHODS.map(({ value, label }) => (
                    <Input
                      key={value}
                      label={label}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.rates?.[value] ?? ""}
                      onChange={(event) => setField("rates", { ...form.rates, [value]: event.target.value })}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              These are saved with the store as in POST /admin/stores. Bills are now taxed by the store's
              Settings › Taxes and Payment Method Surcharges, which the store admin sets after registration.
            </p>
          </div>
        ) : null}

        {current === "Settings" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ToggleCard
              label="POS enabled"
              checked={form.pos_enabled}
              onChange={(value) => setField("pos_enabled", value)}
            />
            <ToggleCard
              label="Web enabled"
              checked={form.web_enabled}
              onChange={(value) => setField("web_enabled", value)}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={back} disabled={step === 0 || submitting}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={submitting || !stepValid()}>
          {step < steps.length - 1 ? (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          ) : submitting ? (
            <>
              <Spinner size={16} />
              Saving…
            </>
          ) : isEdit ? (
            "Save store"
          ) : (
            "Register store"
          )}
        </Button>
      </div>
    </form>
  )
}
