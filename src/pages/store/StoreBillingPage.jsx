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
import { PageHeader } from "../../ui/PageHeader.jsx"
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
      className="inline-flex items-center gap-1 rounded-lg border border-white/25 px-2 py-1 text-xs font-semibold text-white/90 hover:bg-white/10"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

/** The active license key and when it runs out, front and centre. */
function CurrentLicense({ license }) {
  if (!license) {
    return <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500">No license found for this store.</div>
  }
  const left = daysLeft(license.expires_at)
  const expired = left !== null && left < 0
  return (
    <div className="rounded-[24px] bg-brand-700 p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/60">Active license key</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="select-all break-all font-mono text-xl font-semibold">{license.license_key}</span>
              <CopyKey value={license.license_key} />
            </div>
            <p className="mt-2 text-sm text-white/70">
              {license.plan?.name || license.plan?.code || "Plan"} · started {formatDate(license.starts_at)} ·{" "}
              {license.device_count ?? license.device_uuids?.length ?? 0}
              {license.plan?.max_devices != null ? ` / ${license.plan.max_devices}` : ""} devices
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-white/60">Expires</p>
          <p className="mt-1 text-xl font-semibold">{formatDate(license.expires_at)}</p>
          <p className={`mt-1 text-sm font-semibold ${expired || (left !== null && left <= 5) ? "text-rose-300" : "text-white/70"}`}>
            {left === null ? "—" : expired ? "Expired" : `${left} day${left === 1 ? "" : "s"} left`} · {String(license.status || "").replaceAll("_", " ")}
          </p>
        </div>
      </div>
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

  return (
    <section className="space-y-6">
      <PageHeader
        section="Billings"
        title="Billings"
        description={`${store?.name ? `${store.name} · ` : ""}Your active license and every plan payment.`}
      />

      {licenseQuery.isPending ? <PageLoader label="Loading license…" /> : null}
      {licenseQuery.error ? <p className="text-sm text-rose-700">{licenseQuery.error.message}</p> : null}
      {!licenseQuery.isPending && !licenseQuery.error ? <CurrentLicense license={licenseQuery.data} /> : null}

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-950">Billing history</h2>
        <DataTable
          title="Billings"
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

    </section>
  )
}
