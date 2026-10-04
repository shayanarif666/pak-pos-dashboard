import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useCurrentLicenseQuery,
  useStoreBillingsQuery,
  useStoreLicensesQuery,
} from "../../features/billing/storeBillingQuery.js"
import { Currency } from "../../ui/Currency.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

function formatDate(value) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function formatMonth(value) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

// Active first, then pending, then expired / revoked.
const STATUS_ORDER = { active: 0, pending: 1, expired: 2, revoked: 3 }

function LicenseCard({ license, title = "Current license" }) {
  if (!license) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">No license found for this store.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 font-mono text-sm text-slate-700">{license.license_key}</p>
        </div>
        <StatusBadge value={license.status} />
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-slate-500">Plan</dt>
          <dd className="text-slate-800">
            {license.plan?.name || license.plan?.code || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Devices</dt>
          <dd className="text-slate-800">
            {license.device_count ?? license.device_uuids?.length ?? 0}
            {license.plan?.max_devices != null ? ` / ${license.plan.max_devices}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Starts</dt>
          <dd className="text-slate-800">{formatDate(license.starts_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Expires</dt>
          <dd className="text-slate-800">{formatDate(license.expires_at)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function StoreBillingPage() {
  const { user, store } = useAuth()
  const billingsQuery = useStoreBillingsQuery()
  const licenseQuery = useCurrentLicenseQuery()
  const licensesQuery = useStoreLicensesQuery()
  const rows = billingsQuery.data || []
  const licenses = [...(licensesQuery.data || [])].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  )

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          {store?.name ? `${store.name} · ` : ""}
          Read-only invoices and license status for this store.
        </p>
      </div>

      {licenseQuery.isPending ? <PageLoader label="Loading license…" /> : null}
      {licenseQuery.error ? (
        <p className="text-sm text-rose-700">{licenseQuery.error.message}</p>
      ) : (
        <LicenseCard license={licenseQuery.data} />
      )}

      {user?.role === "store_admin" ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">All licenses</h2>
          {licensesQuery.isPending ? <PageLoader label="Loading licenses…" /> : null}
          {licensesQuery.error ? (
            <p className="text-sm text-rose-700">{licensesQuery.error.message}</p>
          ) : null}
          {!licensesQuery.isPending && !licenses.length ? (
            <p className="text-sm text-slate-500">No licenses listed.</p>
          ) : null}
          <div className="grid gap-3">
            {licenses.map((row) => (
              <LicenseCard key={row.id} license={row} title={row.license_key} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Invoice history</h2>
        {billingsQuery.isPending ? <PageLoader label="Loading billings…" /> : null}
        {billingsQuery.error ? (
          <p className="text-sm text-rose-700">{billingsQuery.error.message}</p>
        ) : null}
        {!billingsQuery.isPending && !rows.length ? (
          <p className="rounded-[24px] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
            No invoices yet.
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-[24px] border border-slate-200">
          {rows.length ? (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Method</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-200">
                    <td className="px-4 py-3 text-slate-800">{formatMonth(row.created_at)}</td>
                    <td className="px-4 py-3 text-slate-900">
                      <Currency value={row.amount} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(row.period_start)} → {formatDate(row.period_end)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.paid_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.method_note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </section>
  )
}
