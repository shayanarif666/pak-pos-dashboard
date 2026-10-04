import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthContext.jsx"
import {
  useBillingsQuery,
  useLicensesQuery,
  useStoresQuery,
} from "../features/admin/adminQuery.js"
import { periodForPreset, rangeForPreset } from "../features/reports/dateRange.js"
import { useDashboardReportQuery } from "../features/reports/reportQuery.js"
import { formatCurrency } from "../ui/Currency.jsx"
import { PageLoader } from "../ui/Spinner.jsx"

function Stat({ label, value }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export function OverviewPage() {
  const { user, store, location } = useAuth()
  const isStoreStaff = user.role === "store_admin" || user.role === "manager"
  const filters = useMemo(() => {
    const range = rangeForPreset("month")
    return {
      from: range.from,
      to: range.to,
      period: periodForPreset("month"),
    }
  }, [])
  const dashboardQuery = useDashboardReportQuery(filters, { enabled: isStoreStaff })

  if (user.role === "superadmin") return <PlatformOverview name={user.name} />

  const subtitle =
    user.role === "manager"
      ? location?.name
        ? `Location · ${location.name}`
        : "Location overview"
      : store?.name
        ? `Store · ${store.name}`
        : "Store overview"

  const totals = dashboardQuery.data?.totals

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Home</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Overview</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <p className="mt-2 text-sm text-slate-500">Welcome back, {user.name}. This month so far.</p>
        </div>
        <Link
          to="/reports"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-50"
        >
          Open reports
        </Link>
      </div>

      {dashboardQuery.isPending ? <PageLoader label="Loading KPIs…" /> : null}
      {dashboardQuery.error ? (
        <p className="text-sm text-rose-700">{dashboardQuery.error.message}</p>
      ) : null}

      {totals ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Orders" value={totals.orders ?? 0} />
          <Stat label="Revenue" value={formatCurrency(totals.revenue)} />
          <Stat label="Collected" value={formatCurrency(totals.collected)} />
          <Stat label="Gross profit (excl. tax)" value={formatCurrency(totals.gross_profit)} />
          <Stat label="Tax" value={formatCurrency(totals.tax)} />
          <Stat label="Refunds" value={formatCurrency(totals.refunded_amount)} />
          <Stat label="Voids" value={totals.void_orders ?? 0} />
          <Stat label="Discounts" value={formatCurrency(totals.discount)} />
        </div>
      ) : null}
    </section>
  )
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function PlatformOverview({ name }) {
  const storesQuery = useStoresQuery()
  const licensesQuery = useLicensesQuery()
  const billingsQuery = useBillingsQuery()
  const stores = storesQuery.data || []
  const licenses = licensesQuery.data || []
  const billings = billingsQuery.data || []
  const now = Date.now()
  const expiringSoon = licenses.filter(
    (row) =>
      row.status === "active" &&
      row.expires_at &&
      new Date(row.expires_at).getTime() - now < WEEK_MS
  )
  const pendingBillings = billings.filter((row) => row.status === "pending")
  const loading = storesQuery.isPending || licensesQuery.isPending || billingsQuery.isPending

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Home</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="mt-2 text-sm text-slate-600">Platform overview · welcome back, {name}.</p>
      </div>
      {loading ? <PageLoader label="Loading platform KPIs…" /> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Stores" value={stores.length} />
        <Stat label="Live stores" value={stores.filter((row) => row.is_live).length} />
        <Stat label="Suspended" value={stores.filter((row) => row.is_active === false).length} />
        <Stat label="Active licenses" value={licenses.filter((row) => row.status === "active").length} />
        <Stat label="Expiring in 7 days" value={expiringSoon.length} />
        <Stat label="Expired / revoked" value={licenses.filter((row) => row.status === "expired" || row.status === "revoked").length} />
        <Stat label="Pending billings" value={pendingBillings.length} />
        <Stat
          label="Paid this month"
          value={formatCurrency(
            billings
              .filter((row) => row.status === "paid" && row.paid_at && new Date(row.paid_at).getMonth() === new Date().getMonth() && new Date(row.paid_at).getFullYear() === new Date().getFullYear())
              .reduce((sum, row) => sum + Number(row.amount || 0), 0)
          )}
        />
      </div>
      {expiringSoon.length ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-semibold">Licenses expiring soon</p>
          <ul className="mt-2 space-y-1">
            {expiringSoon.map((row) => (
              <li key={row.id}>
                {row.store?.name || row.store_id} · {row.license_key} · {new Date(row.expires_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
          <Link to="/licenses" className="mt-2 inline-block font-semibold underline">Open licenses</Link>
        </div>
      ) : null}
    </section>
  )
}
