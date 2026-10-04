import { useState } from "react"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { Spinner } from "../../ui/Spinner.jsx"
import {
  BILLING_STATUSES,
  BUSINESS_TYPES,
  STORE_STEPS,
} from "./storeForm.js"

function FieldGrid({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
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
  const progress = ((step + 1) / STORE_STEPS.length) * 100

  function setField(key, value) {
    onChange({ ...form, [key]: value })
  }

  function next() {
    if (step === 1) {
      onChange({
        ...form,
        admin_email: form.admin_email.trim() || form.contact_email.trim(),
        admin_phone: form.admin_phone.trim() || form.contact_phone.trim(),
      })
    }
    setStep((value) => Math.min(STORE_STEPS.length - 1, value + 1))
  }

  function back() {
    setStep((value) => Math.max(0, value - 1))
  }

  function stepValid() {
    if (step === 0) {
      return (
        form.plan_id &&
        form.name.trim() &&
        form.address.trim() &&
        form.contact_email.trim() &&
        form.contact_phone.trim()
      )
    }
    if (step === 1) return form.location_name.trim()
    if (step === 2) {
      return (
        form.admin_name.trim() &&
        form.admin_email.trim() &&
        form.admin_pin.trim() &&
        (isEdit || form.admin_password.trim())
      )
    }
    if (step === 3) {
      return (
        form.manager_name.trim() &&
        form.manager_email.trim() &&
        form.manager_pin.trim() &&
        (isEdit || form.manager_password.trim())
      )
    }
    return true
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (!stepValid()) return
        if (step < STORE_STEPS.length - 1) {
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
              Step {step + 1} of {STORE_STEPS.length}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{STORE_STEPS[step]}</h2>
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
        <ol className="relative grid grid-cols-6 gap-1">
          {STORE_STEPS.map((label, index) => {
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
        {step === 0 ? (
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
              label="Domain (optional)"
              placeholder="shop.example.com"
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
          </FieldGrid>
        ) : null}

        {step === 1 ? (
          <FieldGrid>
            <Input
              label="Location name"
              required
              value={form.location_name}
              onChange={(event) => setField("location_name", event.target.value)}
              placeholder="e.g. Main branch"
            />
            <p className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
              City, phone, and address are taken from store information for the first
              location. You can change them later under Locations.
            </p>
          </FieldGrid>
        ) : null}

        {step === 2 ? (
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
              label={isEdit ? "Admin password (leave blank to keep)" : "Admin password"}
              type="password"
              required={!isEdit}
              value={form.admin_password}
              onChange={(event) => setField("admin_password", event.target.value)}
            />
            <Input
              label="Admin PIN"
              required
              maxLength={6}
              value={form.admin_pin}
              onChange={(event) => setField("admin_pin", event.target.value)}
            />
          </FieldGrid>
        ) : null}

        {step === 3 ? (
          <FieldGrid>
            <Input
              label="Manager name"
              required
              value={form.manager_name}
              onChange={(event) => setField("manager_name", event.target.value)}
            />
            <Input
              label="Manager email"
              type="email"
              required
              value={form.manager_email}
              onChange={(event) => setField("manager_email", event.target.value)}
            />
            <Input
              label="Manager phone"
              value={form.manager_phone}
              onChange={(event) => setField("manager_phone", event.target.value)}
            />
            <Input
              label={isEdit ? "Manager password (leave blank to keep)" : "Manager password"}
              type="password"
              required={!isEdit}
              value={form.manager_password}
              onChange={(event) => setField("manager_password", event.target.value)}
            />
            <Input
              label="Manager PIN"
              required
              maxLength={6}
              value={form.manager_pin}
              onChange={(event) => setField("manager_pin", event.target.value)}
            />
          </FieldGrid>
        ) : null}

        {step === 4 ? (
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
          </FieldGrid>
        ) : null}

        {step === 5 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <Checkbox
                label="POS enabled"
                checked={form.pos_enabled}
                onChange={(event) => setField("pos_enabled", event.target.checked)}
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <Checkbox
                label="Web enabled"
                checked={form.web_enabled}
                onChange={(event) => setField("web_enabled", event.target.checked)}
              />
            </div>
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
          {step < STORE_STEPS.length - 1 ? (
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
