import { Link, useParams } from "react-router-dom"
import { Pencil } from "lucide-react"
import { useStoreQuery } from "../../features/admin/adminQuery.js"
import { Button } from "../../ui/Button.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { Pill, StatusBadge, statusTone } from "../../ui/Pill.jsx"

function Card({ title, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur-xl">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{value ?? "—"}</span>
    </div>
  )
}

function PersonCard({ person }) {
  if (!person) return <p className="text-sm text-slate-500">Not assigned</p>
  return (
    <div className="space-y-0">
      <Row label="Name" value={person.name} />
      <Row label="Email" value={person.email} />
      <Row label="Phone" value={person.phone} />
      <Row label="PIN" value={person.pin} />
      {person.location_name ? <Row label="Location" value={person.location_name} /> : null}
    </div>
  )
}

function count(list) {
  return Array.isArray(list) ? list.length : 0
}

export function StoreDetailPage() {
  const { id } = useParams()
  const storeQuery = useStoreQuery(id)
  const store = storeQuery.data
  const error = storeQuery.error?.message || ""

  if (error) return <p className="text-sm text-rose-700">{error}</p>
  if (storeQuery.isPending || !store) return <PageLoader label="Loading store…" />

  const locations = store.locations || []
  const devices = store.devices || []
  const licenses = store.licenses || []
  const managers = store.managers || []
  const cashiers =
    store.cashiers || locations.flatMap((location) => location.cashiers || [])
  const admin = store.admin || store.store_admin || null
  const billing = store.billings?.[0]
  const latestLicense = licenses[0]
  const kpis = {
    locations: count(locations),
    devices: count(devices) || locations.reduce((sum, row) => sum + count(row.devices), 0),
    licenses: count(licenses),
    managers: count(managers),
    cashiers: count(cashiers),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Store inspect
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{store.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {store.slug}
            {store.custom_domain ? ` · ${store.custom_domain}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill label="Publish" tone={store.is_live ? "emerald" : "zinc"}>
              {store.is_live ? "Live" : "Draft"}
            </Pill>
            <Pill label="Account" tone={store.is_active ? "emerald" : "rose"}>
              {store.is_active ? "Active" : "Suspended"}
            </Pill>
            <Pill label="Business" tone={statusTone(store.business_type)}>
              {store.business_type || "—"}
            </Pill>
            <Pill label="POS" tone={store.pos_enabled ? "sky" : "zinc"}>
              {store.pos_enabled ? "On" : "Off"}
            </Pill>
            <Pill label="Web" tone={store.web_enabled ? "fuchsia" : "zinc"}>
              {store.web_enabled ? "On" : "Off"}
            </Pill>
            <Pill label="Plan" tone="violet">
              {store.plan?.name || "None"}
            </Pill>
            <Pill label="License" tone={statusTone(latestLicense?.status)}>
              {latestLicense?.status || "None"}
            </Pill>
            <Pill label="Billing" tone={statusTone(billing?.status)}>
              {billing?.status || "None"}
            </Pill>
          </div>
        </div>
        <Link to={`/stores/${store.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card title="Locations">
          <p className="text-3xl font-semibold text-slate-900">{kpis.locations}</p>
        </Card>
        <Card title="Devices">
          <p className="text-3xl font-semibold text-slate-900">{kpis.devices}</p>
        </Card>
        <Card title="Licenses">
          <p className="text-3xl font-semibold text-slate-900">{kpis.licenses}</p>
          <p className="mt-1 text-xs text-slate-500">
            {latestLicense?.expires_at
              ? `Expires ${new Date(latestLicense.expires_at).toLocaleDateString()}`
              : "No expiry"}
          </p>
        </Card>
        <Card title="Managers">
          <p className="text-3xl font-semibold text-slate-900">{kpis.managers}</p>
        </Card>
        <Card title="Cashiers">
          <p className="text-3xl font-semibold text-slate-900">{kpis.cashiers}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Store">
          <Row label="Legal name" value={store.legal_name} />
          <Row label="Owner" value={store.owner_name} />
          <Row label="Type" value={store.business_type} />
          <Row label="City" value={store.city} />
          <Row label="Address" value={store.address} />
          <Row label="Email" value={store.contact_email} />
          <Row label="Phone" value={store.contact_phone} />
        </Card>

        <Card title="Billing">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Pill tone="violet">{store.plan?.name || "No plan"}</Pill>
            {billing ? <StatusBadge value={billing.status} /> : null}
          </div>
          <Row label="Plan" value={store.plan?.name} />
          <Row label="Status" value={billing?.status} />
          <Row label="Amount" value={billing?.amount} />
          <Row label="Method" value={billing?.method_note} />
        </Card>
      </div>

      <Card title="Store Admin">
        <PersonCard person={admin} />
      </Card>

      <Card title="Store Managers">
        {managers.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {managers.map((manager) => (
              <div
                key={manager.id}
                className="rounded-2xl border border-slate-200 bg-slate-100 p-4"
              >
                {manager.location_name ? (
                  <div className="mb-2">
                    <Pill tone="fuchsia">{manager.location_name}</Pill>
                  </div>
                ) : null}
                <PersonCard person={manager} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No managers</p>
        )}
      </Card>

      <Card title="Cashiers by location">
        <div className="space-y-4">
          {locations.map((location) => {
            const locationCashiers = location.cashiers || cashiers.filter((row) => row.location_id === location.id)
            return (
              <div key={location.id} className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-slate-900">{location.name}</h3>
                  <Pill tone="cyan">{count(locationCashiers)} cashiers</Pill>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {location.address_line}, {location.city}
                </p>
                {locationCashiers.length ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {locationCashiers.map((cashier) => (
                      <div key={cashier.id} className="rounded-xl border border-slate-200 p-3">
                        <PersonCard person={cashier} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No cashiers at this location</p>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
