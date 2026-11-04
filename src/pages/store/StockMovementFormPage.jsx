import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { resolveDashboardLocation } from "../../features/catalog/dashboardLocation.js"
import { useLocationsQuery, useProductQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useCreateStockMovementsBulk, useSuppliersQuery } from "../../features/inventory/inventoryQuery.js"
import { useStaffQuery } from "../../features/operations/operationsQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"

/*
 * New stock movement (/movements/new) — the Bulk Stock Movements body:
 * { staffId, items: [{ product_id, movement_type, reason, supplier_id?, reason_note?,
 *   variants: [{ id, stock: [{ location_id, qty, stock_unit?, expiry_date? }] }] | stock: [...] }] }.
 * The locations ticked at the top (all, one or several) get a qty row on every product.
 */

const TYPES = [
  { value: "stock_in", label: "Stock in" },
  { value: "stock_out", label: "Stock out" },
  { value: "adjustment", label: "Adjustment (count)" },
]
// Reasons per type (opening_balance is written when a product is created).
const REASONS_BY_TYPE = {
  stock_in: ["purchase", "customer_return", "other"],
  stock_out: ["damage", "expiry", "waste", "theft", "return_to_supplier", "other"],
  adjustment: ["count", "other"],
}
// A supplier goes with a purchase or a return to the supplier.
const SUPPLIER_REASONS = new Set(["purchase", "return_to_supplier"])
const label = (value) => String(value || "").replaceAll("_", " ")

// A pack product / pack variant: units per pack (null = loose). Its qty can be given in packs.
function packSizeOf(row) {
  const size = Number(row?.pack_size)
  return row?.is_pack_product && size >= 2 ? size : null
}

let nextKey = 1
const newItem = () => ({
  key: nextKey++,
  product_id: "",
  movement_type: "stock_in",
  reason: "purchase",
  supplier_id: "",
  reason_note: "",
  // { "variantKey|locationId": { qty, stock_unit, expiry_date } } — variantKey = variant number or "product".
  qtys: {},
  // Filled from the product's detail: what can be moved and where it is sold.
  targets: [],
  soldAt: null,
  hasVariants: false,
})

function Section({ title, description, actions, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

/** One product of the movement: its type, reason, supplier and a qty per variant and location. */
function MovementItem({ index, item, onChange, onRemove, products, suppliers, locations, canRemove }) {
  const productQuery = useProductQuery(item.product_id, {}, { enabled: Boolean(item.product_id) })
  const product = item.product_id ? productQuery.data : null

  // Keep what the body needs from the product detail on the item.
  useEffect(() => {
    if (!product) return
    const targets = product.has_variants
      ? (product.variants || []).map((variant) => ({
          key: String(variant.variant_number),
          label: variant.name,
          stocks: variant.stocks || [],
          packSize: packSizeOf(variant),
        }))
      : [{ key: "product", label: product.title, stocks: product.stocks || [], packSize: packSizeOf(product) }]
    onChange((current) => ({
      ...current,
      targets,
      hasVariants: Boolean(product.has_variants),
      soldAt: product.location_scope === "selected" ? product.location_ids || [] : null,
    }))
    // onChange updates this item only; product is what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const set = (fields) => onChange((current) => ({ ...current, ...fields }))
  const shownLocations = locations.filter((location) => !item.soldAt || item.soldAt.includes(location.id))
  const skipped = locations.filter((location) => item.soldAt && !item.soldAt.includes(location.id))
  const qtyKey = (key, locationId) => `${key}|${locationId}`
  const rowOf = (target, locationId) =>
    item.qtys[qtyKey(target.key, locationId)] || { qty: "", expiry_date: "", stock_unit: target.packSize ? "pack" : "unit" }
  const patchQty = (target, locationId, field, value) =>
    onChange((current) => {
      const id = qtyKey(target.key, locationId)
      const base = current.qtys[id] || { qty: "", expiry_date: "", stock_unit: target.packSize ? "pack" : "unit" }
      return { ...current, qtys: { ...current.qtys, [id]: { ...base, [field]: value } } }
    })

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Product {index + 1}</p>
        {canRemove ? (
          <Button variant="icon" type="button" aria-label={`Remove product ${index + 1}`} title="Remove" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          className="sm:col-span-2 lg:col-span-1"
          label="Product"
          required
          value={item.product_id}
          onChange={(e) => set({ product_id: e.target.value, qtys: {}, targets: [], soldAt: null, hasVariants: false })}
        >
          <option value="">Select product</option>
          {products.map((row) => (
            <option key={row.id} value={row.id}>
              {row.product_number ? `#${row.product_number} · ` : ""}
              {row.title}
            </option>
          ))}
        </Select>
        <Select
          label="Type"
          value={item.movement_type}
          onChange={(e) => set({ movement_type: e.target.value, reason: REASONS_BY_TYPE[e.target.value][0] })}
        >
          {TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
        <Select label="Reason" value={item.reason} onChange={(e) => set({ reason: e.target.value })}>
          {REASONS_BY_TYPE[item.movement_type].map((reason) => (
            <option key={reason} value={reason}>
              {label(reason)}
            </option>
          ))}
        </Select>
        {SUPPLIER_REASONS.has(item.reason) ? (
          <Select label="Supplier (optional)" value={item.supplier_id} onChange={(e) => set({ supplier_id: e.target.value })}>
            <option value="">No supplier</option>
            {suppliers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Input
          className={SUPPLIER_REASONS.has(item.reason) ? "lg:col-span-2" : "sm:col-span-2 lg:col-span-3"}
          label="Note"
          placeholder="e.g. Bill #4521"
          value={item.reason_note}
          onChange={(e) => set({ reason_note: e.target.value })}
        />
      </div>

      {!item.product_id ? null : productQuery.isPending ? (
        <p className="mt-4 text-sm text-slate-500">Loading product…</p>
      ) : !shownLocations.length ? (
        <p className="mt-4 text-sm text-amber-700">This product is not sold at the locations ticked above.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            {item.movement_type === "adjustment" ? "Qty with a sign: +5 adds, -5 takes away." : "Positive qty."} Leave a
            location empty to skip it.
            {skipped.length ? ` Not sold at ${skipped.map((row) => row.name).join(", ")}.` : ""}
          </p>
          {item.targets.map((target) => (
            <div key={target.key} className="rounded-xl border border-slate-200 bg-white p-3">
              {item.hasVariants ? (
                <p className="mb-2 text-sm font-semibold text-slate-900">
                  <span className="mr-2 text-xs font-normal text-slate-400">#{target.key}</span>
                  {target.label}
                  {target.packSize ? <span className="ml-2 text-xs font-normal text-slate-500">pack of {target.packSize}</span> : null}
                </p>
              ) : target.packSize ? (
                <p className="mb-2 text-xs text-slate-500">Pack of {target.packSize}</p>
              ) : null}
              <div className="space-y-2">
                {shownLocations.map((location) => {
                  const row = rowOf(target, location.id)
                  const inPacks = Boolean(target.packSize) && row.stock_unit === "pack"
                  const nowQty = Number(target.stocks.find((stock) => stock.location_id === location.id)?.qty || 0)
                  return (
                    <div
                      key={location.id}
                      className={`grid grid-cols-2 items-end gap-3 ${target.packSize ? "md:grid-cols-[minmax(0,1.2fr)_1fr_1fr_1fr]" : "md:grid-cols-[minmax(0,1.2fr)_1fr_1fr]"}`}
                    >
                      <div className="col-span-2 md:col-span-1 md:pb-2.5">
                        <p className="text-sm font-medium text-slate-800">{location.name}</p>
                        <p className="text-xs text-slate-500">
                          In stock: {nowQty}
                          {target.packSize ? ` (${Math.floor(nowQty / target.packSize)} packs)` : ""}
                        </p>
                      </div>
                      {target.packSize ? (
                        <Select label="Qty in" value={row.stock_unit} onChange={(e) => patchQty(target, location.id, "stock_unit", e.target.value)}>
                          <option value="pack">Packs (× {target.packSize})</option>
                          <option value="unit">Loose items</option>
                        </Select>
                      ) : null}
                      <div>
                        <Input
                          label={inPacks ? "Packs" : "Qty"}
                          type="number"
                          min={item.movement_type === "adjustment" ? undefined : "0"}
                          step={inPacks ? "1" : "0.01"}
                          value={row.qty}
                          onChange={(e) => patchQty(target, location.id, "qty", e.target.value)}
                        />
                        {inPacks && row.qty !== "" ? <p className="mt-1 text-xs text-slate-500">= {Number(row.qty) * target.packSize} items</p> : null}
                      </div>
                      {item.movement_type === "stock_in" ? (
                        <Input label="Expiry (optional)" type="date" value={row.expiry_date} onChange={(e) => patchQty(target, location.id, "expiry_date", e.target.value)} />
                      ) : (
                        <span className="hidden md:block" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StockMovementFormPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isAdmin = auth.user.role === "store_admin"
  const tokenLocation = resolveDashboardLocation(auth)
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const productsQuery = useProductsQuery()
  const suppliersQuery = useSuppliersQuery()
  const staffQuery = useStaffQuery()
  const saveBulk = useCreateStockMovementsBulk()

  // A store admin ticks the locations; a manager moves stock at their own location only.
  const allLocations = useMemo(
    () => (isAdmin ? (locationsQuery.data || []).filter((row) => row.is_active !== false) : tokenLocation ? [tokenLocation] : []),
    [isAdmin, locationsQuery.data, tokenLocation]
  )
  const [locationIds, setLocationIds] = useState(null)
  const pickedIds = locationIds ?? (allLocations.length === 1 ? [allLocations[0].id] : [])
  const pickedLocations = allLocations.filter((row) => pickedIds.includes(row.id))
  const allPicked = allLocations.length > 0 && pickedLocations.length === allLocations.length
  const [staffId, setStaffId] = useState("")
  const [items, setItems] = useState(() => [newItem()])
  const [error, setError] = useState("")

  const products = (productsQuery.data || []).filter((row) => row.is_active !== false)
  const staff = (staffQuery.data || []).filter((row) => row.is_active !== false)

  const toggleLocation = (id) =>
    setLocationIds(pickedIds.includes(id) ? pickedIds.filter((value) => value !== id) : [...pickedIds, id])
  const updateItem = (key) => (update) =>
    setItems((current) => current.map((row) => (row.key === key ? (typeof update === "function" ? update(row) : update) : row)))

  /** The item as the API takes it, or null when no qty was entered. */
  function itemBody(item) {
    const rowsOf = (target) =>
      pickedLocations
        .filter((location) => !item.soldAt || item.soldAt.includes(location.id))
        .map((location) => {
          const row = item.qtys[`${target.key}|${location.id}`]
          if (!row || row.qty === "" || Number(row.qty) === 0) return null
          const inPacks = Boolean(target.packSize) && row.stock_unit === "pack"
          return {
            location_id: location.id,
            qty: Number(row.qty),
            ...(inPacks ? { stock_unit: "pack" } : {}),
            ...(row.expiry_date && item.movement_type === "stock_in" ? { expiry_date: row.expiry_date } : {}),
          }
        })
        .filter(Boolean)
    const body = {
      product_id: item.product_id,
      movement_type: item.movement_type,
      reason: item.reason,
      ...(SUPPLIER_REASONS.has(item.reason) && item.supplier_id ? { supplier_id: item.supplier_id } : {}),
      ...(item.reason_note.trim() ? { reason_note: item.reason_note.trim() } : {}),
    }
    if (item.hasVariants) {
      body.variants = item.targets.map((target) => ({ id: Number(target.key), stock: rowsOf(target) })).filter((row) => row.stock.length)
      return body.variants.length ? body : null
    }
    body.stock = item.targets.length ? rowsOf(item.targets[0]) : []
    return body.stock.length ? body : null
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    if (!pickedLocations.length) return setError("Tick at least one location the stock came in at (or left from).")
    const chosen = items.filter((item) => item.product_id)
    if (!chosen.length) return setError("Pick at least one product.")
    const bodies = chosen.map(itemBody)
    const empty = bodies.findIndex((body) => !body)
    if (empty >= 0) return setError(`Product ${items.indexOf(chosen[empty]) + 1}: enter a quantity for at least one location.`)
    try {
      const json = await saveBulk.mutateAsync({ ...(staffId ? { staffId } : {}), items: bodies })
      const failed = json?.data?.failed || []
      if (failed.length) {
        // "Product 1 · 1.5L · Defense View: …" — which row failed, each message once.
        const locationName = (ref) => allLocations.find((row) => row.id === ref || String(row.location_number) === String(ref))?.name
        const lines = failed.map((row) => {
          const item = chosen[row.index]
          const variant = item?.targets.find((target) => target.key === String(row.variant_id))?.label
          const where = [`Product ${items.indexOf(item) + 1}`, variant, locationName(row.location_id)].filter(Boolean).join(" · ")
          return `${where}: ${row.message}`
        })
        setError([...new Set(lines)].join("\n"))
        toast(`Saved ${json?.data?.created_count ?? 0}, ${failed.length} failed`, "error")
        return
      }
      toast("Stock movement recorded")
      navigate("/movements")
    } catch (err) {
      setError(err.message)
    }
  }

  if ((isAdmin && locationsQuery.isPending) || productsQuery.isPending) return <PageLoader label="Loading…" />

  return (
    <section className="space-y-6">
      <Link to="/movements" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        Back to stock movements
      </Link>
      <PageHeader
        section="Inventory"
        title="Record stock movement"
        description="Stock in, stock out or a count for one or more products, at all, one or several locations. A pack product can be counted in packs or loose items."
      />

      <form onSubmit={save} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Locations" description={isAdmin ? "Where the stock came in (or left): all, one or several." : "Your location."}>
            {allLocations.length ? (
              <div className="space-y-3">
                {isAdmin && allLocations.length > 1 ? (
                  <Checkbox
                    label="All locations"
                    checked={allPicked}
                    onChange={() => setLocationIds(allPicked ? [] : allLocations.map((row) => row.id))}
                  />
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  {allLocations.map((row) => (
                    <Checkbox
                      key={row.id}
                      label={row.name}
                      checked={pickedIds.includes(row.id)}
                      disabled={!isAdmin}
                      onChange={() => toggleLocation(row.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No location on this account.</p>
            )}
          </Section>
          <Section title="Done by" description="The staff member who received or removed the stock.">
            <Select label="Staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Me ({auth.user.name})</option>
              {staff
                .filter((row) => row.id !== auth.user.id)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {label(row.role)}
                  </option>
                ))}
            </Select>
          </Section>
        </div>

        <Section
          title="Products"
          description="One row per product and reason. Each ticked location gets its own quantity."
          actions={
            <Button type="button" variant="ghost" onClick={() => setItems((current) => [...current, newItem()])}>
              <Plus className="h-4 w-4" /> Add product
            </Button>
          }
        >
          <div className="space-y-4">
            {items.map((item, index) => (
              <MovementItem
                key={item.key}
                index={index}
                item={item}
                onChange={updateItem(item.key)}
                onRemove={() => setItems((current) => current.filter((row) => row.key !== item.key))}
                products={products}
                suppliers={suppliersQuery.data || []}
                locations={pickedLocations}
                canRemove={items.length > 1}
              />
            ))}
          </div>
        </Section>

        {error ? <p className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Link to="/movements">
            <Button variant="ghost" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saveBulk.isPending}>{saveBulk.isPending ? "Saving…" : "Record movement"}</Button>
        </div>
      </form>
    </section>
  )
}
