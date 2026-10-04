import { useMemo, useState } from "react"
import { CalendarClock, CalendarPlus, PauseCircle, PlayCircle, Plus, Search } from "lucide-react"
import {
  useActivateLicense,
  useCreateLicense,
  useExtendLicense,
  useLicensesQuery,
  usePlansQuery,
  useRenewLicense,
  useStoresQuery,
  useSuspendLicense,
} from "../../features/admin/adminQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, statusTone } from "../../ui/Pill.jsx"

const GRACE_DAYS = 2

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—"
}

function formatPrice(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `Rs. ${amount.toLocaleString()}` : "—"
}

export function LicensesPage() {
  const { toast, confirmToast } = useToast()
  const licensesQuery = useLicensesQuery()
  const storesQuery = useStoresQuery()
  const plansQuery = usePlansQuery()
  const createLicenseMutation = useCreateLicense()
  const extendMutation = useExtendLicense()
  const renewMutation = useRenewLicense()
  const suspendMutation = useSuspendLicense()
  const activateMutation = useActivateLicense()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [issueOpen, setIssueOpen] = useState(false)
  const [renewing, setRenewing] = useState(null)
  const [suspending, setSuspending] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const allRows = licensesQuery.data || []
  const stores = storesQuery.data || []
  const plans = (plansQuery.data || []).filter((plan) => plan.is_active !== false)
  const loading = licensesQuery.isPending || storesQuery.isPending || plansQuery.isPending

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false
      if (!q) return true
      return [row.license_key, row.store?.name, row.store?.slug].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    })
  }, [allRows, search, statusFilter])

  async function run(row, action, successMessage) {
    setBusyId(row.id)
    try {
      await action()
      toast(successMessage)
      return true
    } catch (err) {
      toast(err.message, "error")
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function extend(row) {
    const ok = await confirmToast({
      title: `Extend by ${GRACE_DAYS} days?`,
      message: `${row.store?.name || "This store"} keeps working for ${GRACE_DAYS} more days. These days are deducted from the next month when the license is renewed.`,
      confirmLabel: `Extend ${GRACE_DAYS} days`,
    })
    if (!ok) return
    await run(row, () => extendMutation.mutateAsync(row.id), `License extended by ${GRACE_DAYS} days`)
  }

  async function activate(row) {
    const ok = await confirmToast({
      title: "Activate this license?",
      message: `Dashboard and POS of ${row.store?.name || "this store"} start working again.`,
      confirmLabel: "Activate",
    })
    if (!ok) return
    await run(row, () => activateMutation.mutateAsync(row.id), "License activated")
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Super Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Licenses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Extend gives {GRACE_DAYS} grace days (taken back on renewal). Renew adds one month on the
            plan the store bought and records the payment. Suspend blocks dashboard and POS.
          </p>
        </div>
        <Button onClick={() => setIssueOpen(true)}>
          <Plus className="h-4 w-4" />
          Issue license
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-600"
            placeholder="Search key or store"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select className="min-w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="revoked">Revoked</option>
        </Select>
      </div>

      {loading ? <PageLoader label="Loading licenses…" /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const busy = busyId === row.id
          const closed = row.status === "revoked"
          const suspended = row.status === "suspended"
          const extended = Number(row.grace_days) > 0
          return (
            <article
              key={row.id}
              className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold tracking-wide text-slate-900">
                    {row.license_key}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-600">{row.store?.name || row.store_id}</p>
                </div>
                <Pill label="Status" tone={statusTone(row.status)}>
                  {row.status}
                </Pill>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Pill label="Plan" tone="violet">
                  {row.plan?.name || row.plan?.code || "Plan"}
                </Pill>
                <Pill label="Devices" tone={row.device_count > 0 ? "sky" : "zinc"}>
                  {row.device_count > 0 ? `${row.device_count}/${row.plan?.max_devices ?? "?"}` : "None"}
                </Pill>
                {extended ? (
                  <Pill label="Grace" tone="amber">
                    +{row.grace_days} days, deducted on renewal
                  </Pill>
                ) : null}
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarClock className="h-3.5 w-3.5" />
                Expires {formatDate(row.expires_at)}
              </p>
              {suspended ? (
                <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  Suspended {formatDate(row.suspended_at)}
                  {row.suspended_reason ? ` · ${row.suspended_reason}` : ""}
                </p>
              ) : null}

              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <Button
                  variant="ghost"
                  disabled={busy || closed || suspended || extended}
                  title={extended ? "Already extended. Renew to extend again." : undefined}
                  onClick={() => extend(row)}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Extend {GRACE_DAYS} days
                </Button>
                <Button disabled={busy || closed} onClick={() => setRenewing(row)}>
                  <CalendarClock className="h-4 w-4" />
                  Renew +1 month
                </Button>
                {suspended ? (
                  <Button className="col-span-2" disabled={busy} onClick={() => activate(row)}>
                    <PlayCircle className="h-4 w-4" />
                    Activate license
                  </Button>
                ) : (
                  <Button
                    className="col-span-2"
                    variant="danger"
                    disabled={busy || closed}
                    onClick={() => setSuspending(row)}
                  >
                    <PauseCircle className="h-4 w-4" />
                    Suspend license
                  </Button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {!loading && !rows.length ? (
        <p className="text-sm text-slate-500">
          {allRows.length ? "No licenses match the filters." : "No licenses yet. Issue one for a store."}
        </p>
      ) : null}

      <IssueLicenseModal
        open={issueOpen}
        stores={stores}
        plans={plans}
        mutation={createLicenseMutation}
        onClose={() => setIssueOpen(false)}
        onDone={() => toast("License created")}
      />
      <RenewLicenseModal
        license={renewing}
        plans={plans}
        mutation={renewMutation}
        onClose={() => setRenewing(null)}
        onDone={(data) =>
          toast(`License renewed until ${new Date(data.expires_at).toLocaleDateString()}. Billing recorded.`)
        }
      />
      <SuspendLicenseModal
        license={suspending}
        mutation={suspendMutation}
        onClose={() => setSuspending(null)}
        onDone={() => toast("License suspended")}
      />
    </section>
  )
}

function IssueLicenseModal({ open, stores, plans, mutation, onClose, onDone }) {
  const [storeId, setStoreId] = useState("")
  const [planId, setPlanId] = useState("")
  const [error, setError] = useState("")

  function close() {
    setStoreId("")
    setPlanId("")
    setError("")
    onClose()
  }

  async function submit(event) {
    event.preventDefault()
    setError("")
    try {
      await mutation.mutateAsync({ store_id: storeId, plan_id: planId || undefined })
      onDone()
      close()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal open={open} onClose={close} size="md">
      <ModalCard as="form" title="Issue license" onClose={close} onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Store"
            required
            value={storeId}
            onChange={(event) => {
              setStoreId(event.target.value)
              setPlanId(stores.find((row) => row.id === event.target.value)?.plan_id || "")
            }}
          >
            <option value="">Select store</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </Select>
          <Select label="Plan" value={planId} onChange={(event) => setPlanId(event.target.value)}>
            <option value="">Store default plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({plan.code})
              </option>
            ))}
          </Select>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Issuing…" : "Issue license"}
          </Button>
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
        </div>
      </ModalCard>
    </Modal>
  )
}

function RenewLicenseModal({ license, plans, mutation, onClose, onDone }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState("")

  // Reset the form whenever a different license is opened.
  const current = form && form.licenseId === license?.id ? form : null
  const values = current || {
    licenseId: license?.id,
    plan_id: license?.plan_id || "",
    amount: "",
    billing_status: "paid",
    method_note: "",
  }
  const plan = plans.find((row) => row.id === values.plan_id)

  function update(patch) {
    setForm({ ...values, ...patch })
  }

  function close() {
    setForm(null)
    setError("")
    onClose()
  }

  async function submit(event) {
    event.preventDefault()
    setError("")
    try {
      const json = await mutation.mutateAsync({
        id: license.id,
        body: {
          plan_id: values.plan_id,
          amount: values.amount === "" ? undefined : Number(values.amount),
          billing_status: values.billing_status,
          method_note: values.method_note || undefined,
        },
      })
      onDone(json.data || {})
      close()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal open={Boolean(license)} onClose={close} size="md">
      {license ? (
        <ModalCard as="form" title="Renew +1 month" onClose={close} onSubmit={submit}>
          <p className="text-sm text-slate-600">
            {license.store?.name} · <span className="font-mono">{license.license_key}</span>
          </p>
          {Number(license.grace_days) > 0 ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {license.grace_days} grace day(s) given earlier will be deducted from this month.
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Plan for next month"
              required
              value={values.plan_id}
              onChange={(event) => update({ plan_id: event.target.value, amount: "" })}
            >
              <option value="">Select plan</option>
              {plans.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {formatPrice(row.price_pkr)}
                </option>
              ))}
            </Select>
            <Input
              label="Amount (PKR)"
              type="number"
              min="0"
              step="1"
              placeholder={plan ? String(Number(plan.price_pkr)) : "Plan price"}
              value={values.amount}
              onChange={(event) => update({ amount: event.target.value })}
            />
            <Select
              label="Payment status"
              value={values.billing_status}
              onChange={(event) => update({ billing_status: event.target.value })}
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </Select>
            <Input
              label="Payment note"
              placeholder="e.g. JazzCash TXN 12345"
              value={values.method_note}
              onChange={(event) => update({ method_note: event.target.value })}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            A billing transaction is created automatically. Leave amount empty to charge the plan price.
          </p>
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={mutation.isPending || !values.plan_id}>
              {mutation.isPending ? "Renewing…" : "Renew +1 month"}
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </ModalCard>
      ) : null}
    </Modal>
  )
}

function SuspendLicenseModal({ license, mutation, onClose, onDone }) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  function close() {
    setReason("")
    setError("")
    onClose()
  }

  async function submit(event) {
    event.preventDefault()
    setError("")
    try {
      await mutation.mutateAsync({ id: license.id, body: { reason: reason.trim() || undefined } })
      onDone()
      close()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal open={Boolean(license)} onClose={close} size="md">
      {license ? (
        <ModalCard as="form" title="Suspend license" onClose={close} onSubmit={submit}>
          <p className="text-sm text-slate-600">
            Staff of <b>{license.store?.name || "this store"}</b> are signed out and cannot use the
            dashboard or POS until the license is activated again.
          </p>
          <Textarea
            className="mt-4"
            label="Reason (optional)"
            rows={3}
            placeholder="e.g. Payment dispute"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
          <div className="mt-5 flex gap-2">
            <Button type="submit" variant="danger" disabled={mutation.isPending}>
              {mutation.isPending ? "Suspending…" : "Suspend license"}
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </ModalCard>
      ) : null}
    </Modal>
  )
}
