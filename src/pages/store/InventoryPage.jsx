import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Boxes, Package, Search } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useCategoriesQuery,
  useLocationsQuery,
  useProductsQuery,
  useSaveStock,
} from "../../features/catalog/catalogQuery.jsx"
import { resolveDashboardLocation } from "../../features/catalog/dashboardLocation.js"
import { STOCK_REASONS } from "../../features/catalog/productForm.js"
import { Button } from "../../ui/Button.jsx"
import { Currency, formatNumber } from "../../ui/Currency.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

function stockForLocation(product, locationId) {
  return (product.stocks || []).find((row) => row.location_id === locationId) || null
}

function reasonLabel(reason) {
  return String(reason || "").replaceAll("_", " ")
}

function draftsFromProducts(products, locationId) {
  const next = {}
  for (const product of products) {
    const stock = stockForLocation(product, locationId)
    next[product.id] = {
      qty: stock ? String(stock.qty) : "0",
      low_stock_threshold: stock?.low_stock_threshold ?? product.low_stock_threshold ?? "",
      expiry_date: stock?.expiry_date ? String(stock.expiry_date).slice(0, 10) : "",
      reason: stock ? "count" : "opening_balance",
    }
  }
  return next
}

export function InventoryPage() {
  const auth = useAuth()
  const { user, location } = auth
  const { toast } = useToast()
  const isAdmin = user.role === "store_admin"
  const tokenLocation = resolveDashboardLocation(auth)
  const [locationId, setLocationId] = useState(tokenLocation?.id || location?.id || "")
  const [q, setQ] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [filters, setFilters] = useState({ q: "", categoryId: "" })
  const [lowOnly, setLowOnly] = useState(false)
  const [drafts, setDrafts] = useState({})
  const saveStock = useSaveStock()

  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const categoriesQuery = useCategoriesQuery()
  const productsQuery = useProductsQuery(
    {
      locationId,
      q: filters.q,
      categoryId: filters.categoryId,
    },
    { enabled: Boolean(locationId) }
  )

  const locations = locationsQuery.data || []
  const categories = categoriesQuery.data || []
  const products = productsQuery.data || []
  const loading =
    categoriesQuery.isPending ||
    (isAdmin && locationsQuery.isPending) ||
    (Boolean(locationId) && productsQuery.isPending)
  const error =
    categoriesQuery.error?.message ||
    locationsQuery.error?.message ||
    productsQuery.error?.message ||
    ""

  useEffect(() => {
    if (!isAdmin || locationId || !locations.length) return
    const preferred =
      locations.find((row) => row.id === tokenLocation?.id) ||
      locations.find((row) => row.is_default) ||
      locations[0]
    if (preferred) setLocationId(preferred.id)
  }, [isAdmin, locationId, locations, tokenLocation?.id])

  useEffect(() => {
    setDrafts(draftsFromProducts(products, locationId))
  }, [products, locationId])

  const visible = useMemo(() => {
    return products.filter((product) => {
      const stock = stockForLocation(product, locationId)
      if (lowOnly && !stock?.is_low) return false
      return true
    })
  }, [products, locationId, lowOnly])

  const stats = useMemo(() => {
    const low = products.filter((product) => stockForLocation(product, locationId)?.is_low).length
    const totalQty = products.reduce((sum, product) => {
      const stock = stockForLocation(product, locationId)
      return sum + Number(stock?.qty || 0)
    }, 0)
    return {
      products: products.length,
      low,
      qty: totalQty,
    }
  }, [products, locationId])

  function patchDraft(productId, key, value) {
    setDrafts((current) => ({
      ...current,
      [productId]: { ...current[productId], [key]: value },
    }))
  }

  async function save(product) {
    const draft = drafts[product.id]
    if (!draft || !locationId) return
    try {
      await saveStock.mutateAsync({
        productId: product.id,
        body: {
          location_id: locationId,
          qty: Number(draft.qty),
          low_stock_threshold: draft.low_stock_threshold === "" ? null : Number(draft.low_stock_threshold),
          expiry_date: draft.expiry_date || null,
          reason: draft.reason,
        },
      })
      toast(`Stock saved for ${product.title}`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  function search(event) {
    event.preventDefault()
    setFilters({ q, categoryId })
  }

  const activeLocation =
    locations.find((row) => row.id === locationId) ||
    (locationId === tokenLocation?.id ? tokenLocation : null) ||
    tokenLocation

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Product Stock</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Quantities belong to one location. This session is scoped to{" "}
            <span className="text-slate-700">{activeLocation?.name || "your login location"}</span>
            {isAdmin ? ". Switch branch below to count another location." : "."}
          </p>
        </div>
        <Link to="/products/new">
          <Button>
            <Package className="h-4 w-4" />
            New product
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 backdrop-blur-2xl">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Products</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.products}</p>
        </article>
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 backdrop-blur-2xl">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">On hand</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(stats.qty)}</p>
        </article>
        <article className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 backdrop-blur-2xl">
          <p className="text-xs uppercase tracking-[0.16em] text-rose-700">Low stock</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.low}</p>
        </article>
      </div>

      {isAdmin && locations.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {locations.map((row) => {
            const active = row.id === locationId
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setLocationId(row.id)}
                className={[
                  "rounded-full border px-3.5 py-1.5 text-sm transition",
                  active
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700",
                ].join(" ")}
              >
                {row.name}
                {row.is_default ? " · default" : ""}
                {row.id === tokenLocation?.id ? " · login" : ""}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mb-4">
          <Pill tone="sky">{activeLocation?.name || "Login location"}</Pill>
        </div>
      )}

      <form
        onSubmit={search}
        className="mb-6 grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 md:grid-cols-[1fr_200px_auto_auto]"
      >
        <Input
          label="Search"
          placeholder="Title, SKU, barcode"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button type="submit" variant="ghost" className="w-full">
            <Search className="h-4 w-4" />
            Filter
          </Button>
        </div>
        <label className="flex items-end gap-2 pb-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
            className="h-4 w-4 accent-brand-700"
          />
          Low stock only
        </label>
      </form>

      {error ? <p className="mb-4 text-sm text-rose-700">{error}</p> : null}
      {loading ? <PageLoader label="Loading stock…" /> : null}

      {!loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((product) => {
            const draft = drafts[product.id] || {}
            const stock = stockForLocation(product, locationId)
            const low = Boolean(stock?.is_low)
            return (
              <article
                key={product.id}
                className={[
                  "rounded-[28px] border p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl",
                  low ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-500">
                      <Boxes className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/products/${product.id}`}
                          className="block truncate text-lg font-semibold text-slate-900 hover:text-brand-700"
                        >
                          {product.title}
                        </Link>
                        <p className="text-xs text-slate-500">SKU {product.sku}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill tone="violet"><Currency value={product.selling_price} /></Pill>
                        {low ? <Pill tone="rose">Low</Pill> : <Pill tone="emerald">In stock</Pill>}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      On hand{" "}
                      <span className="font-semibold text-slate-900">{stock ? stock.qty : 0}</span>
                      {product.unit ? ` ${product.unit}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.qty ?? ""}
                    onChange={(e) => patchDraft(product.id, "qty", e.target.value)}
                  />
                  <Input
                    label="Low stock at"
                    type="number"
                    min="0"
                    value={draft.low_stock_threshold ?? ""}
                    onChange={(e) => patchDraft(product.id, "low_stock_threshold", e.target.value)}
                  />
                  <Input
                    label="Expiry"
                    type="date"
                    value={draft.expiry_date ?? ""}
                    onChange={(e) => patchDraft(product.id, "expiry_date", e.target.value)}
                  />
                  <Select
                    label="Reason"
                    value={draft.reason || "count"}
                    onChange={(e) => patchDraft(product.id, "reason", e.target.value)}
                  >
                    {STOCK_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reasonLabel(reason)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    disabled={saveStock.isPending && saveStock.variables?.productId === product.id}
                    onClick={() => save(product)}
                  >
                    {saveStock.isPending && saveStock.variables?.productId === product.id
                      ? "Saving…"
                      : "Save stock"}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {!loading && !visible.length ? (
        <p className="mt-8 text-sm text-slate-500">No products match this location filter.</p>
      ) : null}
    </section>
  )
}
