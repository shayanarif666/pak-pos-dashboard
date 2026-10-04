import { Link } from "react-router-dom"
import { Eye, Pencil, Plus } from "lucide-react"
import { useStoresQuery } from "../../features/admin/adminQuery.js"
import { Button } from "../../ui/Button.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { Pill, StatusBadge, statusTone } from "../../ui/Pill.jsx"

export function StoresPage() {
  const storesQuery = useStoresQuery()
  const stores = storesQuery.data || []
  const loading = storesQuery.isPending
  const error = storesQuery.error?.message || ""

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Super Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Stores</h1>
        </div>
        <Link to="/stores/register">
          <Button>
            <Plus className="h-4 w-4" />
            Register store
          </Button>
        </Link>
      </div>

      {loading ? <PageLoader label="Loading stores…" /> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stores.map((store) => (
          <article
            key={store.id}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{store.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{store.city || "—"}</p>
              </div>
              <Pill tone={store.is_live ? "emerald" : "zinc"}>
                {store.is_live ? "Live" : "Draft"}
              </Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <StatusBadge value={store.business_type} />
              <Pill tone="violet">{store.plan?.name || "No plan"}</Pill>
              <Pill tone={statusTone(store.license?.status)}>
                {store.license?.status || "No license"}
              </Pill>
              <Pill tone={store.pos_enabled ? "sky" : "zinc"}>
                {store.pos_enabled ? "POS on" : "POS off"}
              </Pill>
              <Pill tone={store.web_enabled ? "fuchsia" : "zinc"}>
                {store.web_enabled ? "Web on" : "Web off"}
              </Pill>
            </div>
            {store.license?.expires_at ? (
              <p className="mt-3 text-xs text-slate-500">
                License expires {new Date(store.license.expires_at).toLocaleDateString()}
              </p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <Link to={`/stores/${store.id}`}>
                <Button variant="icon" aria-label="View store">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={`/stores/${store.id}/edit`}>
                <Button variant="icon" aria-label="Edit store">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </article>
        ))}
      </div>

      {!loading && !stores.length ? (
        <p className="mt-8 text-sm text-slate-500">No stores yet. Register the first merchant.</p>
      ) : null}
    </section>
  )
}
