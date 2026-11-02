import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Search } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useCategoriesQuery, useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useOfferQuery, useSaveOffer } from "../../features/promotions/promotionQuery.js"
import { LocationScopeField } from "../../features/scope/LocationScopeField.jsx"
import { formatCurrency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { Switch } from "../../ui/Switch.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { TYPE_LABEL } from "./OffersPage.jsx"

/*
 * Add and edit a discount on its own page (/discounts/new, /discounts/:id/edit): the same body as
 * the Bulk Offer Creation payload, with room for every product's single item / pack choice.
 */

const TYPE_HINT = {
  promotional: "A percentage or fixed amount off.",
  flash_sale: "A sale price per product (or a % / amount off for categories).",
  bulk_discount: "Off when the customer buys at least the minimum quantity.",
  bogo: "Buy some, get some free.",
}

const emptyForm = {
  name: "",
  type: "promotional",
  discount_type: "percentage",
  discount_value: "",
  min_qty: "",
  buy_qty: "",
  get_qty: "",
  // Pack products: the discount's default (categories), and how min / buy / get are counted.
  sale_unit: "both",
  min_qty_unit: "unit",
  buy_unit: "unit",
  get_unit: "unit",
  start_at: "",
  end_at: "",
  is_active: true,
  location_scope: "all",
  location_ids: [],
  products: [],
  categories: [],
}

// On a pack product: what the discount applies to.
const SALE_UNIT_LABEL = { unit: "Single item", pack: "Full pack", both: "Both" }

const isPack = (product) => Boolean(product?.is_pack_product) && Number(product?.pack_size) >= 2
/** unit | pack | both for this product (a pack sold only whole: pack). */
function effectiveSaleUnit(product, own, fallback) {
  if (!isPack(product)) return "unit"
  if (!product.sell_loose) return "pack"
  return own || fallback || "both"
}

/** Segmented picker: Single item / Full pack / Both. */
function UnitPicker({ value, onChange, options = ["unit", "pack", "both"], labels = SALE_UNIT_LABEL }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={["rounded-lg px-2.5 py-1 text-xs font-semibold transition", value === option ? "bg-brand-700 text-white" : "text-slate-600 hover:text-brand-700"].join(" ")}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  )
}


/** Searchable checkbox list (products / categories). */
function MultiPick({ label, options, selected, onToggle, empty }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const shown = q ? options.filter((row) => `${row.label} ${row.hint || ""}`.toLowerCase().includes(q)) : options
  return (
    <div className="rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-500">{selected.length} selected</span>
      </div>
      <div className="relative border-b border-slate-100">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none" />
      </div>
      <div className="max-h-80 overflow-y-auto p-1">
        {shown.map((row) => {
          const checked = selected.includes(row.id)
          return (
            <label key={row.id} className={["flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm", checked ? "bg-brand-50" : "hover:bg-slate-50"].join(" ")}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(row.id)} className="h-4 w-4 accent-[#135c4c]" />
              <span className="min-w-0 flex-1 truncate text-slate-900">{row.label}</span>
              {row.hint ? <span className="shrink-0 text-xs text-slate-500">{row.hint}</span> : null}
            </label>
          )
        })}
        {!shown.length ? <p className="px-3 py-4 text-center text-sm text-slate-500">{empty}</p> : null}
      </div>
    </div>
  )
}

/** ISO date → the local value a datetime-local input shows. */
function toLocalInput(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function DiscountFormPage() {
  const { id } = useParams()
  const editingId = id || null
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(!editingId)

  const offerQuery = useOfferQuery(editingId)
  const productsQuery = useProductsQuery({}, { sellable: true })
  const categoriesQuery = useCategoriesQuery()
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const saveOffer = useSaveOffer()

  // A parent with variants is not sold itself: its variants are picked instead.
  const products = (productsQuery.data || []).filter((row) => !row.has_variants)
  const categories = categoriesQuery.data || []
  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const productById = useMemo(() => new Map((productsQuery.data || []).map((row) => [row.id, row])), [productsQuery.data])
  // Offers name their locations by number; the scope picker works with location UUIDs.
  const locationIdOfNumber = useMemo(
    () => Object.fromEntries((locationsQuery.data || []).map((row) => [String(row.location_number), row.id])),
    [locationsQuery.data]
  )
  const productTargets = (row) => (row.targets || []).filter((t) => t.product_id)
  const categoryTargets = (row) => (row.targets || []).filter((t) => t.category_id)
  const offer = editingId ? offerQuery.data : null

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  function toggleProduct(id) {
    setForm((current) => ({
      ...current,
      products: current.products.some((p) => p.product_id === id)
        ? current.products.filter((p) => p.product_id !== id)
        : [...current.products, { product_id: id, sale_unit: "", promo_price: "", promo_pack_price: "", free_product_id: "" }],
    }))
  }
  const patchProduct = (id, key, value) =>
    setForm((current) => ({ ...current, products: current.products.map((p) => (p.product_id === id ? { ...p, [key]: value } : p)) }))
  const toggleCategory = (id) =>
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(id) ? current.categories.filter((c) => c !== id) : [...current.categories, id],
    }))

  /** An offer from the API as form values (edit). */
  function formOf(row) {
    return {
      name: row.name || "",
      type: row.type || "promotional",
      discount_type: row.discount_type || "percentage",
      discount_value: row.discount_value ?? "",
      min_qty: row.min_qty ?? "",
      buy_qty: row.buy_qty ?? "",
      get_qty: row.get_qty ?? "",
      sale_unit: row.sale_unit || "both",
      min_qty_unit: row.min_qty_unit || "unit",
      buy_unit: row.buy_unit || "unit",
      get_unit: row.get_unit || "unit",
      start_at: toLocalInput(row.start_at),
      end_at: toLocalInput(row.end_at),
      is_active: row.is_active !== false,
      location_scope: row.location_scope || "all",
      location_ids: (row.location_ids || []).map((number) => locationIdOfNumber[String(number)]).filter(Boolean),
      products: productTargets(row).map((t) => ({
        product_id: t.product_id,
        sale_unit: t.sale_unit || "",
        promo_price: t.promo_price ?? "",
        promo_pack_price: t.promo_pack_price ?? "",
        free_product_id: t.free_product_id || "",
      })),
      categories: categoryTargets(row).map((t) => t.category_id),
    }
  }

  function buildBody() {
    const usesDiscount = form.type === "promotional" || form.type === "bulk_discount" || (form.type === "flash_sale" && form.discount_value !== "")
    return {
      name: form.name.trim(),
      type: form.type,
      discount_type: usesDiscount ? form.discount_type : null,
      discount_value: usesDiscount ? Number(form.discount_value) : null,
      min_qty: form.type === "bulk_discount" ? Number(form.min_qty) : null,
      min_qty_unit: form.type === "bulk_discount" ? form.min_qty_unit : "unit",
      buy_qty: form.type === "bogo" ? Number(form.buy_qty) : null,
      buy_unit: form.type === "bogo" ? form.buy_unit : "unit",
      get_qty: form.type === "bogo" ? Number(form.get_qty) : null,
      get_unit: form.type === "bogo" ? form.get_unit : "unit",
      sale_unit: form.sale_unit,
      products: form.products.map((p) => {
        const product = productById.get(p.product_id)
        const unit = effectiveSaleUnit(product, p.sale_unit, form.sale_unit)
        return {
          product_id: p.product_id,
          // A pack product: single item, full pack or both.
          ...(isPack(product) ? { sale_unit: unit } : {}),
          ...(form.type === "flash_sale" && p.promo_price !== "" && unit !== "pack" ? { promo_price: Number(p.promo_price) } : {}),
          ...(form.type === "flash_sale" && p.promo_pack_price !== "" && unit !== "unit" ? { promo_pack_price: Number(p.promo_pack_price) } : {}),
          ...(form.type === "bogo" && p.free_product_id ? { free_product_id: p.free_product_id } : {}),
        }
      }),
      categories: form.categories,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      is_active: form.is_active,
      // Any role may send it; a manager's new discount without it runs at their location.
      ...(isAdmin
        ? { location_scope: form.location_scope, location_ids: form.location_scope === "selected" ? form.location_ids : [] }
        : {}),
    }
  }

  function formError() {
    if (!form.name.trim()) return "Give the discount a name."
    if (!form.products.length && !form.categories.length) return "Pick at least one product or category."
    if ((form.type === "promotional" || form.type === "bulk_discount") && form.discount_value === "") return "Enter the discount value."
    if (form.type === "bulk_discount" && !(Number(form.min_qty) > 0)) return "Enter the minimum quantity."
    if (form.type === "bogo" && !(Number(form.buy_qty) > 0 && Number(form.get_qty) > 0)) return "Enter buy and get quantities."
    if (form.type === "flash_sale") {
      const hasDiscount = form.discount_value !== ""
      if (form.categories.length && !hasDiscount) return "A flash sale on categories needs a % or amount off."
      if (!hasDiscount) {
        for (const p of form.products) {
          const product = productById.get(p.product_id)
          const unit = effectiveSaleUnit(product, p.sale_unit, form.sale_unit)
          const name = product?.title || "A product"
          if (unit !== "pack" && p.promo_price === "") return `${name}: give its sale price (single item), or a % / amount off.`
          if (unit !== "unit" && p.promo_pack_price === "") return `${name}: give its pack sale price, or a % / amount off.`
        }
      }
    }
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) return "A percentage cannot be over 100."
    if (form.start_at && form.end_at && form.end_at < form.start_at) return "The end must be after the start."
    if (isAdmin && form.location_scope === "selected" && !form.location_ids.length) return "Pick at least one location, or choose All locations."
    return ""
  }

  async function save(event) {
    event.preventDefault()
    const problem = formError()
    if (problem) return setError(problem)
    setError("")
    try {
      await saveOffer.mutateAsync({ id: editingId, body: buildBody() })
      toast(editingId ? "Discount updated" : "Discount created")
      navigate("/discounts")
    } catch (err) {
      setError(err.message)
    }
  }


  // Edit: the saved discount as form values, once it (and the locations) have loaded.
  useEffect(() => {
    if (!offer || loaded || (isAdmin && locationsQuery.isPending)) return
    setForm(formOf(offer))
    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer, loaded, isAdmin, locationsQuery.isPending])

  const productOptions = products.map((row) => ({
    id: row.id,
    label: row.title,
    hint: isPack(row) ? `${formatCurrency(row.selling_price)} · pack of ${row.pack_size} ${formatCurrency(row.pack_selling_price)}` : formatCurrency(row.selling_price),
  }))
  // The discount's own unit / pack / both matters for categories (their pack products).
  const selectedPack = form.products.some((p) => isPack(productById.get(p.product_id)))
  const categoryOptions = categories.map((row) => ({ id: row.id, label: row.name }))
  const usesDiscountFields = form.type !== "bogo"

  if (editingId && (offerQuery.isPending || !loaded)) {
    if (offerQuery.error) return <p className="text-sm text-rose-700">{offerQuery.error.message}</p>
    return <PageLoader label="Loading discount…" />
  }

  return (
    <section className="space-y-6">
      <Link to="/discounts" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        Back to discounts
      </Link>
      <PageHeader
        section="Promotions"
        title={editingId ? `Edit ${offer?.name || "discount"}` : "New discount"}
        description={editingId ? `Discount #${offer?.offer_number}` : "Sales on several products and categories at once."}
      />

      <form onSubmit={save} className="space-y-6">
      <div className="space-y-6">
        <Section title="Discount" description="Its name, its kind and how much comes off.">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Eid Sale 10%" />
          <Select label="Type" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
        <p className="-mt-2 text-xs text-slate-500">{TYPE_HINT[form.type]}</p>

        <div className="grid gap-4 md:grid-cols-3">
          {usesDiscountFields ? (
            <>
              <Select label="Discount type" value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (Rs off)</option>
              </Select>
              <Input
                label={form.type === "flash_sale" ? "Value (optional with sale prices)" : "Value"}
                type="number"
                min="0"
                step="0.01"
                value={form.discount_value}
                onChange={(e) => set("discount_value", e.target.value)}
              />
            </>
          ) : null}
          {form.type === "bulk_discount" ? (
            <div className="flex items-end gap-2">
              <Input label="Minimum quantity" type="number" min="1" step="1" required value={form.min_qty} onChange={(e) => set("min_qty", e.target.value)} className="min-w-0 flex-1" />
              <Select label="Counted in" value={form.min_qty_unit} onChange={(e) => set("min_qty_unit", e.target.value)}>
                <option value="unit">Single items</option>
                <option value="pack">Packs</option>
              </Select>
            </div>
          ) : null}
          {form.type === "bogo" ? (
            <>
              <div className="flex items-end gap-2">
                <Input label="Buy" type="number" min="1" step="1" required value={form.buy_qty} onChange={(e) => set("buy_qty", e.target.value)} className="min-w-0 flex-1" />
                <Select label="Of" value={form.buy_unit} onChange={(e) => set("buy_unit", e.target.value)}>
                  <option value="unit">Single items</option>
                  <option value="pack">Packs</option>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Input label="Get free" type="number" min="1" step="1" required value={form.get_qty} onChange={(e) => set("get_qty", e.target.value)} className="min-w-0 flex-1" />
                <Select label="Of" value={form.get_unit} onChange={(e) => set("get_unit", e.target.value)}>
                  <option value="unit">Single items</option>
                  <option value="pack">Packs</option>
                </Select>
              </div>
            </>
          ) : null}
        </div>
        {form.type === "bogo" ? (
          <p className="-mt-2 text-xs text-slate-500">
            e.g. buy 1 pack, get 1 single item free. Packs only count on pack products; others use single items.
          </p>
        ) : form.discount_type === "fixed" && usesDiscountFields ? (
          <p className="-mt-2 text-xs text-slate-500">A fixed amount comes off each single item, or each pack when a pack is sold.</p>
        ) : null}

        </Section>

        <Section title="Products and categories" description="Pick several of each. A pack product says whether the discount is for a single item, the full pack or both.">
        <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <MultiPick label="Products" options={productOptions} selected={form.products.map((p) => p.product_id)} onToggle={toggleProduct} empty="No products." />
          <MultiPick label="Categories" options={categoryOptions} selected={form.categories} onToggle={toggleCategory} empty="No categories." />
        </div>

        {form.categories.length || selectedPack ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">On pack products</p>
              <p className="text-xs text-slate-500">The default for pack products in the selected categories (and products left on default).</p>
            </div>
            <UnitPicker value={form.sale_unit} onChange={(value) => set("sale_unit", value)} />
          </div>
        ) : null}

        {form.products.length ? (
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-medium text-slate-700">
              Selected products{form.type === "flash_sale" ? " · sale prices" : form.type === "bogo" ? " · free item (empty = the same product)" : ""}
            </p>
            <div className="space-y-3">
              {form.products.map((p) => {
                const product = productById.get(p.product_id)
                const pack = isPack(product)
                const unit = effectiveSaleUnit(product, p.sale_unit, form.sale_unit)
                return (
                  <div key={p.product_id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-slate-900">
                        {product?.title || "Product"}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          · {formatCurrency(product?.selling_price)}{pack ? ` · pack of ${product.pack_size} ${formatCurrency(product.pack_selling_price)}` : ""}
                        </span>
                      </p>
                      <button type="button" className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => toggleProduct(p.product_id)}>Remove</button>
                    </div>
                    {pack ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-600">This discount is for:</span>
                        {product.sell_loose ? (
                          <UnitPicker value={unit} onChange={(value) => patchProduct(p.product_id, "sale_unit", value)} />
                        ) : (
                          <Pill tone="sky" dot={false}>Full pack only (not sold loose)</Pill>
                        )}
                      </div>
                    ) : null}
                    {form.type === "flash_sale" ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {unit !== "pack" ? (
                          <Input label="Sale price (single item)" type="number" min="0" step="0.01" value={p.promo_price} onChange={(e) => patchProduct(p.product_id, "promo_price", e.target.value)} />
                        ) : null}
                        {pack && unit !== "unit" ? (
                          <Input label={`Sale price (pack of ${product.pack_size})`} type="number" min="0" step="0.01" value={p.promo_pack_price} onChange={(e) => patchProduct(p.product_id, "promo_pack_price", e.target.value)} />
                        ) : null}
                      </div>
                    ) : null}
                    {form.type === "bogo" ? (
                      <div className="mt-2 max-w-sm">
                        <Select label="Free item" value={p.free_product_id} onChange={(e) => patchProduct(p.product_id, "free_product_id", e.target.value)}>
                          <option value="">Same product</option>
                          {products.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
                        </Select>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        </div>
        </Section>

        <Section title="When and where" description="Leave the dates empty to run it with no start or end.">
        <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Starts" type="datetime-local" value={form.start_at} onChange={(e) => set("start_at", e.target.value)} />
          <Input label="Ends" type="datetime-local" value={form.end_at} onChange={(e) => set("end_at", e.target.value)} />
        </div>

        {isAdmin ? (
          <LocationScopeField title="Runs at" value={form} locations={locations} onChange={(next) => setForm((current) => ({ ...current, location_scope: next.location_scope, location_ids: next.location_ids }))} />
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">This discount runs at your location.</p>
        )}

        <div className="flex items-center gap-3">
          <Switch checked={form.is_active} label="Active" onChange={(next) => set("is_active", next)} />
          <span className="text-sm text-slate-700">{form.is_active ? "Active — applies at checkout" : "Inactive — never applied"}</span>
        </div>
        </div>
        </Section>
      </div>


        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Link to="/discounts">
            <Button variant="ghost" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saveOffer.isPending}>{saveOffer.isPending ? "Saving…" : editingId ? "Save discount" : "Create discount"}</Button>
        </div>
      </form>
    </section>
  )
}
