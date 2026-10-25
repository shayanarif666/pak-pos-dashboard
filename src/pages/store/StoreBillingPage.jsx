import { useMemo, useState } from "react"
import { Check, Copy, KeyRound } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useCurrentLicenseQuery,
  useStoreBillingsQuery,
  useStoreLicensesQuery,
} from "../../features/billing/storeBillingQuery.js"
import { DataTable } from "../../ui/DataTable.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { formatDate, formatDateTime } from "../../ui/format.js"

function daysLeft(expiresAt) {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt) - new Date()) / 86400000)
}

function CopyKey({ value }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked: the key is still selectable on screen.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

/** The store's current license, front and centre. */
function CurrentLicense({ license }) {
  if (!license) {
    return <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500">No license found for this store.</div>
  }
  const left = daysLeft(license.expires_at)
  return (
    <div className="rounded-[24px] border border-brand-200 bg-brand-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current license key</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="select-all font-mono text-lg font-semibold text-slate-900">{license.license_key}</span>
              <CopyKey value={license.license_key} />
            </div>
          </div>
        </div>
        <StatusBadge value={license.status} />
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <dt className="text-slate-500">Plan</dt>
          <dd className="font-medium text-slate-900">{license.plan?.name || license.plan?.code || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Started</dt>
          <dd className="font-medium text-slate-900">{formatDate(license.starts_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Expires</dt>
          <dd className="font-medium text-slate-900">{formatDate(license.expires_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Days left</dt>
          <dd className={`font-medium ${left !== null && left <= 5 ? "text-rose-700" : "text-slate-900"}`}>
            {left === null ? "—" : left < 0 ? "Expired" : left}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Devices</dt>
          <dd className="font-medium text-slate-900">
            {license.device_count ?? license.device_uuids?.length ?? 0}
            {license.plan?.max_devices != null ? ` / ${license.plan.max_devices}` : ""}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/** Billings (store admin): the current license key and every monthly plan purchase. */
export function StoreBillingPage() {
  const { store } = useAuth()
  const billingsQuery = useStoreBillingsQuery()
  const licenseQuery = useCurrentLicenseQuery()
  const licensesQuery = useStoreLicensesQuery()
  const rows = useMemo(() => billingsQuery.data || [], [billingsQuery.data])
  const licenses = licensesQuery.data || []

  // Plan names by id (from the licenses, which carry their plan).
  const planName = useMemo(() => {
    const map = new Map()
    for (const license of [licenseQuery.data, ...licenses]) {
      if (license?.plan_id && license.plan) map.set(license.plan_id, license.plan.name || license.plan.code)
    }
    return (id) => map.get(id) || "—"
  }, [licenseQuery.data, licenses])

  const totals = useMemo(() => {
    const paid = rows.filter((row) => row.status === "paid")
    return {
      records: rows.length,
      paid: paid.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      pending: rows.filter((row) => row.status === "pending").reduce((sum, row) => sum + Number(row.amount || 0), 0),
      last: paid.map((row) => row.paid_at).filter(Boolean).sort().pop(),
    }
  }, [rows])

  return (
    <section className="space-y-6">
      <PageHeader
        section="Billings"
        title="Billings"
        description={`${store?.name ? `${store.name} · ` : ""}Your license and every monthly plan purchase.`}
      />

      {licenseQuery.isPending ? <PageLoader label="Loading license…" /> : null}
      {licenseQuery.error ? <p className="text-sm text-rose-700">{licenseQuery.error.message}</p> : null}
      {!licenseQuery.isPending && !licenseQuery.error ? <CurrentLicense license={licenseQuery.data} /> : null}

      <StatCards
        items={[
          { label: "Billing records", value: totals.records },
          { label: "Total paid", value: <Currency value={totals.paid} /> },
          { label: "Pending", value: <Currency value={totals.pending} /> },
          { label: "Last payment", value: formatDate(totals.last) },
        ]}
      />

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Plan purchases</h2>
        <DataTable
          columns={[
            { key: "month", header: "Month", sortValue: (row) => new Date(row.period_start || row.created_at), render: (row) => new Date(row.period_start || row.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) },
            { key: "plan", header: "Plan", sortValue: (row) => planName(row.plan_id), render: (row) => planName(row.plan_id) },
            { key: "amount", header: "Amount", align: "right", sortValue: (row) => Number(row.amount), render: (row) => <span className="font-semibold"><Currency value={row.amount} /></span> },
            { key: "period", header: "Period", sortValue: (row) => new Date(row.period_start), render: (row) => `${formatDate(row.period_start)} → ${formatDate(row.period_end)}` },
            { key: "paid_at", header: "Paid on", sortValue: (row) => (row.paid_at ? new Date(row.paid_at) : null), render: (row) => formatDateTime(row.paid_at) },
            { key: "method_note", header: "Method", render: (row) => row.method_note || "—" },
            { key: "note", header: "Note", sortable: false, className: "max-w-64 truncate", render: (row) => row.note || "—" },
            { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          ]}
          rows={rows}
          loading={billingsQuery.isPending}
          error={billingsQuery.error}
          search={{ placeholder: "Search note or method…", text: (row) => `${row.note || ""} ${row.method_note || ""} ${planName(row.plan_id)}` }}
          filters={[
            { key: "status", label: "Status", options: ["paid", "pending", "failed", "refunded"].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })) },
          ]}
          dateRange={{ value: (row) => row.period_start || row.created_at }}
          initialSort={{ key: "month", dir: "desc" }}
          emptyText="No plan purchases yet."
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">All licenses</h2>
        <DataTable
          columns={[
            { key: "license_key", header: "License key", render: (row) => <span className="font-mono text-slate-900">{row.license_key}</span> },
            { key: "plan", header: "Plan", sortValue: (row) => row.plan?.name, render: (row) => row.plan?.name || planName(row.plan_id) },
            { key: "starts_at", header: "Starts", sortValue: (row) => new Date(row.starts_at), render: (row) => formatDate(row.starts_at) },
            { key: "expires_at", header: "Expires", sortValue: (row) => new Date(row.expires_at), render: (row) => formatDate(row.expires_at) },
            { key: "devices", header: "Devices", align: "right", sortValue: (row) => Number(row.device_count || 0), render: (row) => row.device_count ?? row.device_uuids?.length ?? 0 },
            { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          ]}
          rows={licenses}
          loading={licensesQuery.isPending}
          error={licensesQuery.error}
          initialSort={{ key: "starts_at", dir: "desc" }}
          emptyText="No licenses listed."
        />
      </div>
    </section>
  )
}
