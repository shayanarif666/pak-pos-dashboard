import { useState } from "react"
import { KeyRound, Mail, MapPin, Pencil, Phone, Store, X } from "lucide-react"
import { useAuth } from "../auth/AuthContext.jsx"
import { ROLE_LABEL } from "../auth/roles.js"
import { useCurrentLicenseQuery } from "../features/billing/storeBillingQuery.js"
import { useLocationsQuery } from "../features/catalog/catalogQuery.jsx"
import { useMyStoreQuery } from "../features/settings/settingsQuery.js"
import { AccountForm } from "./AccountPage.jsx"
import { StoreForm } from "./store/SettingsPage.jsx"
import { Button } from "../ui/Button.jsx"
import { PageHeader } from "../ui/PageHeader.jsx"
import { StatusBadge } from "../ui/Pill.jsx"
import { PageLoader } from "../ui/Spinner.jsx"
import { formatDate, formatDateTime } from "../ui/format.js"

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

function Panel({ title, description, action = null, children }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{children ?? "—"}</dd>
    </div>
  )
}

const yesNo = (value) => (value ? "On" : "Off")

/** Store admin: everything about the store, its plan and license, and the store edit form. */
function StoreDetails() {
  const storeQuery = useMyStoreQuery()
  const licenseQuery = useCurrentLicenseQuery()
  const locationsQuery = useLocationsQuery()
  const [editing, setEditing] = useState(false)
  const store = storeQuery.data?.store || storeQuery.data
  const license = licenseQuery.data
  const locations = locationsQuery.data || []

  if (storeQuery.isPending) return <PageLoader label="Loading store…" />
  if (storeQuery.error) return <p className="text-sm text-rose-700">{storeQuery.error.message}</p>
  if (!store) return null

  return (
    <>
      <Panel
        title="Store"
        description="Your store as receipts, the POS and customers see it."
        action={
          <Button variant={editing ? "ghost" : "primary"} onClick={() => setEditing((value) => !value)}>
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editing ? "Close" : "Edit store"}
          </Button>
        }
      >
        {editing ? (
          <StoreForm plain />
        ) : (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Store #">{store.store_number}</Field>
            <Field label="Status"><StatusBadge value={store.status} /></Field>
            <Field label="Store name">{store.name}</Field>
            <Field label="Legal name">{store.legal_name}</Field>
            <Field label="Owner">{store.owner_name}</Field>
            <Field label="Business type"><span className="capitalize">{store.business_type || "—"}</span></Field>
            <Field label="NTN">{store.ntn}</Field>
            <Field label="STRN">{store.strn}</Field>
            <Field label="Contact email">{store.contact_email}</Field>
            <Field label="Contact phone">{store.contact_phone}</Field>
            <Field label="City">{store.city}</Field>
            <Field label="Address">{store.address}</Field>
            <Field label="Currency">{store.currency}</Field>
            <Field label="Timezone">{store.timezone}</Field>
            <Field label={store.status === "trial" ? "Trial ends" : "Since"}>
              {formatDate(store.status === "trial" ? store.trial_ends_at : store.created_at)}
            </Field>
            <Field label="Locations">{locations.length}{store.plan?.max_locations != null ? ` / ${store.plan.max_locations}` : ""}</Field>
            <Field label="Sales tax">{store.sales_tax_enabled ? `${Number(store.sales_tax_rate || 0)}%` : "Off"}</Field>
            <Field label="Payment method GST">{yesNo(store.payment_tax_enabled)}</Field>
            <Field label="FBR invoice">{yesNo(store.fbr_invoice_enabled)}</Field>
            <Field label="Expiry warning / critical">{store.expiry_warning_days ?? "—"} / {store.expiry_critical_days ?? "—"} days</Field>
          </dl>
        )}
      </Panel>

      <Panel title="Plan & license" description="The plan your store is on and its current license key.">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Plan">{store.plan?.name || license?.plan?.name || "—"}</Field>
          <Field label="Max devices">{store.plan?.max_devices ?? "—"}</Field>
          <Field label="Max locations">{store.plan?.max_locations ?? "—"}</Field>
          <Field label="License status">{license ? <StatusBadge value={license.status} /> : "—"}</Field>
          <Field label="License key"><span className="font-mono">{license?.license_key || "—"}</span></Field>
          <Field label="Expires">{formatDate(license?.expires_at)}</Field>
        </dl>
        {locations.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {locations.map((row) => (
              <span key={row.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                <MapPin className="h-3 w-3" />
                {row.name}
                {row.is_active === false ? " (inactive)" : ""}
              </span>
            ))}
          </div>
        ) : null}
      </Panel>
    </>
  )
}

/** Profile: the signed-in user (and, for a store admin, the whole store). */
export function ProfilePage() {
  const { user, store, location } = useAuth()
  const isAdmin = user.role === "store_admin"
  const isPlatform = user.role === "superadmin"

  return (
    <section className="space-y-6">
      <PageHeader title="Profile" description="Your details and sign-in. Changes here apply on the POS too." />

      <div className="flex flex-wrap items-center gap-5 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xl font-bold text-white">
          {initialsOf(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold text-slate-950">{user.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">{ROLE_LABEL[user.role]}{user.user_number ? ` · Staff #${user.user_number}` : ""}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" />{user.email}</span>
            {user.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" />{user.phone}</span> : null}
            {!isPlatform ? (
              <span className="inline-flex items-center gap-1.5"><Store className="h-4 w-4 text-slate-400" />{store?.name || "Store"}</span>
            ) : null}
            {!isPlatform ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                {isAdmin ? "All locations" : location?.name || "Assigned location"}
              </span>
            ) : null}
            {user.last_login_at ? (
              <span className="inline-flex items-center gap-1.5"><KeyRound className="h-4 w-4 text-slate-400" />Last sign-in {formatDateTime(user.last_login_at)}</span>
            ) : null}
          </div>
        </div>
      </div>

      <Panel title="Account" description="Name, phone and POS PIN. A forgotten password is reset from the sign-in page.">
        <AccountForm allowPin={!isPlatform} plain />
      </Panel>

      {isAdmin ? <StoreDetails /> : null}
    </section>
  )
}
