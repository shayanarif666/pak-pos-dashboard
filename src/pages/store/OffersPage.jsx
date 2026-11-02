import { useMemo, useState } from "react"
import { Eye, Pencil, Plus, Search, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useCategoriesQuery, useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useOffersQuery, useSaveOffer } from "../../features/promotions/promotionQuery.js"
import { LocationScopeField, LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
import { Currency, formatCurrency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { Select } from "../../ui/Select.jsx"
import { Switch } from "../../ui/Switch.jsx"
import { useToast } from "../../ui/Toast.jsx"

/*
 * Discounts (the API's offers): each one applies to several products and / or categories, built
 * the same way as the Bulk Offer Creation payload: { name, type, discount_type, discount_value,
 * products: [{ product_id, sale_unit?, promo_price?, promo_pack_price?, free_product_id? }],
 * categories: [ids], sale_unit, min_qty + min_qty_unit, buy_qty + buy_unit, get_qty + get_unit,
 * start_at, end_at, is_active, location_scope, location_ids }.
 *
 * Pack products: each one says whether the discount is for a single item, the whole pack or both
 * (sale_unit); categories use the discount's own sale_unit. A fixed amount is per item or per pack.
 */

// On a pack product: what the discount applies to.
const SALE_UNIT_LABEL = { unit: "Single item", pack: "Full pack", both: "Both" }
const COUNT_UNIT_LABEL = { unit: "Single items", pack: "Packs" }

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

const TYPE_LABEL = {
  promotional: "Promotional",
  flash_sale: "Flash sale",
  bulk_discount: "Bulk discount",
  bogo: "Buy X get Y (BOGO)",
}
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

/** Running now: switched on and inside its start / end window. */
function offerState(row, now = Date.now()) {
  if (!row.is_active) return "inactive"
  if (row.start_at && new Date(row.start_at).getTime() > now) return "scheduled"
  if (row.end_at && new Date(row.end_at).getTime() < now) return "expired"
  return "running"
}

const STATE_PILL = {
  running: { tone: "emerald", label: "Running" },
  scheduled: { tone: "sky", label: "Scheduled" },
  expired: { tone: "amber", label: "Expired" },
  inactive: { tone: "zinc", label: "Inactive" },
}

const countText = (qty, unit) => `${qty ?? "?"}${unit === "pack" ? ` pack${Number(qty) === 1 ? "" : "s"}` : ""}`

function discountText(row) {
  if (row.type === "bogo") return `Buy ${countText(row.buy_qty, row.buy_unit)} get ${countText(row.get_qty, row.get_unit)}`
  if (row.discount_value == null) return row.type === "flash_sale" ? "Sale prices" : "—"
  const amount = row.discount_type === "percentage" ? `${row.discount_value}%` : formatCurrency(row.discount_value)
  return row.type === "bulk_discount" ? `${amount} from ${countText(row.min_qty, row.min_qty_unit)}` : amount
}

/** ISO date → the local value a datetime-local input shows. */
function toLocalInput(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Open"
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
      <div className="max-h-52 overflow-y-auto p-1">
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

function Info({ label, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{children}</div>
    </div>
  )
}

export function DiscountsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [toggling, setToggling] = useState({})

  const offersQuery = useOffersQuery()
  const productsQuery = useProductsQuery({}, { sellable: true })
  const categoriesQuery = useCategoriesQuery()
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const saveOffer = useSaveOffer()

  const offers = offersQuery.data || []
  // A parent with variants is not sold itself: its variants are picked instead.
  const products = (productsQuery.data || []).filter((row) => !row.has_variants)
  const categories = categoriesQuery.data || []
  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const productById = useMemo(() => new Map((productsQuery.data || []).map((row) => [row.id, row])), [productsQuery.data])
  const categoryById = useMemo(() => new Map(categories.map((row) => [row.id, row])), [categories])
  // Offers name their locations by number; the scope picker works with location UUIDs.
  const locationIdOfNumber = useMemo(
    () => Object.fromEntries((locationsQuery.data || []).map((row) => [String(row.location_number), row.id])),
    [locationsQuery.data]
  )

  const productTargets = (row) => (row.targets || []).filter((t) => t.product_id)
  const categoryTargets = (row) => (row.targets || []).filter((t) => t.category_id)
  function appliesTo(row) {
    const names = [
      ...productTargets(row).map((t) => productById.get(t.product_id)?.title || "Product"),
      ...categoryTargets(row).map((t) => categoryById.get(t.category_id)?.name || "Category"),
    ]
    if (!names.length) return "—"
    return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ")
  }

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

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
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
    })
    setError("")
    setShowForm(true)
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
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleActive(row, next) {
    setToggling((current) => ({ ...current, [row.id]: true }))
    try {
      await saveOffer.mutateAsync({ id: row.id, body: { is_active: next } })
      toast(next ? `${row.name} is active` : `${row.name} is inactive`)
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setToggling((current) => ({ ...current, [row.id]: false }))
    }
  }

  const now = Date.now()
  const columns = [
    {
      key: "name",
      header: "Discount",
      render: (row) => (
        <div className="min-w-44">
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">#{row.offer_number} · {TYPE_LABEL[row.type] || row.type}</p>
        </div>
      ),
    },
    {
      key: "applies",
      header: "Applies to",
      sortable: false,
      render: (row) => (
        <div className="max-w-64">
          <p className="truncate text-slate-900">{appliesTo(row)}</p>
          <p className="text-xs text-slate-500">
            {productTargets(row).length} product{productTargets(row).length === 1 ? "" : "s"} · {categoryTargets(row).length} categor{categoryTargets(row).length === 1 ? "y" : "ies"}
          </p>
        </div>
      ),
    },
    { key: "discount", header: "Discount", sortValue: (row) => Number(row.discount_value || 0), render: (row) => discountText(row) },
    { key: "window", header: "Runs", sortValue: (row) => row.start_at || "", render: (row) => <span className="text-xs text-slate-600">{formatDate(row.start_at)} → {formatDate(row.end_at)}</span> },
    { key: "locations", header: "Locations", sortable: false, render: (row) => <LocationScopePills row={row} /> },
    {
      key: "state",
      header: "Status",
      sortValue: (row) => offerState(row, now),
      render: (row) => {
        const state = STATE_PILL[offerState(row, now)]
        return <Pill tone={state.tone}>{state.label}</Pill>
      },
    },
    {
      key: "is_active",
      header: "Active",
      sortValue: (row) => (row.is_active ? 1 : 0),
      render: (row) => (
        <Switch checked={Boolean(row.is_active)} disabled={Boolean(toggling[row.id])} label={row.is_active ? `Turn off ${row.name}` : `Turn on ${row.name}`} onChange={(next) => toggleActive(row, next)} />
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="icon" aria-label="View discount" onClick={() => setSelected(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label="Edit discount" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  const productOptions = products.map((row) => ({
    id: row.id,
    label: row.title,
    hint: isPack(row) ? `${formatCurrency(row.selling_price)} · pack of ${row.pack_size} ${formatCurrency(row.pack_selling_price)}` : formatCurrency(row.selling_price),
  }))
  // The discount's own unit / pack / both matters for categories (their pack products).
  const selectedPack = form.products.some((p) => isPack(productById.get(p.product_id)))
  const categoryOptions = categories.map((row) => ({ id: row.id, label: row.name }))
  const usesDiscountFields = form.type !== "bogo"

  return (
    <section className="space-y-6">
      <PageHeader
        section="Promotions"
        title="Discounts"
        description="Sales on several products and categories at once. Switch one off to stop it at checkout; switch it back on any time."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add discount</Button>}
      />

      <StatCards
        items={[
          { label: "Discounts", value: offers.length },
          { label: "Running now", value: offers.filter((row) => offerState(row, now) === "running").length },
          { label: "Scheduled", value: offers.filter((row) => offerState(row, now) === "scheduled").length },
          { label: "Inactive", value: offers.filter((row) => !row.is_active).length, hint: `${offers.filter((row) => offerState(row, now) === "expired").length} expired` },
        ]}
      />

      <DataTable
        columns={columns}
        rows={offers}
        loading={offersQuery.isPending}
        error={offersQuery.error}
        search={{ placeholder: "Search discount, product or category…", text: (row) => `${row.name} ${row.offer_number} ${appliesTo(row)}` }}
        filters={[
          { key: "type", label: "Type", options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })), match: (row, value) => row.type === value },
          { key: "status", label: "Status", options: Object.entries(STATE_PILL).map(([value, state]) => ({ value, label: state.label })), match: (row, value) => offerState(row, now) === value },
          { key: "apply_to", label: "Applies to", options: [{ value: "product", label: "Products" }, { value: "category", label: "Categories" }, { value: "mixed", label: "Both" }], match: (row, value) => row.apply_to === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(row) => setSelected(row)}
        emptyText="No discounts yet."
      />

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
        <form onSubmit={save} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingId ? `Edit ${form.name || "discount"}` : "New discount"}</h2>
            <button type="button" className="text-slate-600 hover:text-brand-700" onClick={() => setShowForm(false)} aria-label="Close"><X className="h-5 w-5" /></button>
          </div>

          <div className="space-y-5">
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

          {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saveOffer.isPending}>{saveOffer.isPending ? "Saving…" : editingId ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Discount #{selected.offer_number}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Pill tone={STATE_PILL[offerState(selected)].tone}>{STATE_PILL[offerState(selected)].label}</Pill>
                  <Pill tone="zinc" dot={false}>{TYPE_LABEL[selected.type] || selected.type}</Pill>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { const row = selected; setSelected(null); openEdit(row) }}><Pencil className="h-4 w-4" /> Edit</Button>
                <button type="button" className="text-slate-600 hover:text-brand-700" onClick={() => setSelected(null)} aria-label="Close"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Discount">{discountText(selected)}</Info>
              <Info label="Discount type">{selected.discount_type || "—"}</Info>
              <Info label="Applies to">{selected.apply_to === "mixed" ? "Products and categories" : selected.apply_to === "product" ? "Products" : "Categories"}</Info>
              {selected.type === "bulk_discount" ? <Info label="Minimum quantity">{selected.min_qty} {COUNT_UNIT_LABEL[selected.min_qty_unit || "unit"].toLowerCase()}</Info> : null}
              {selected.type === "bogo" ? (
                <Info label="Buy / get free">
                  {selected.buy_qty} {COUNT_UNIT_LABEL[selected.buy_unit || "unit"].toLowerCase()} / {selected.get_qty} {COUNT_UNIT_LABEL[selected.get_unit || "unit"].toLowerCase()}
                </Info>
              ) : null}
              <Info label="On pack products">{SALE_UNIT_LABEL[selected.sale_unit || "both"]}</Info>
              <Info label="Starts">{formatDate(selected.start_at)}</Info>
              <Info label="Ends">{formatDate(selected.end_at)}</Info>
              <Info label="Runs at"><LocationScopePills row={selected} /></Info>
              <Info label="Added">{formatDate(selected.created_at)}</Info>
              <Info label="Last changed">{formatDate(selected.updated_at)}</Info>
            </div>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Products ({productTargets(selected).length})</h3>
            {productTargets(selected).length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Price</th>
                      <th className="px-4 py-2.5 font-semibold">For</th>
                      {selected.type === "flash_sale" ? <th className="px-4 py-2.5 text-right font-semibold">Sale price</th> : null}
                      {selected.type === "bogo" ? <th className="px-4 py-2.5 font-semibold">Free item</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {productTargets(selected).map((t) => {
                      const product = productById.get(t.product_id)
                      return (
                        <tr key={t.id} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 text-slate-900">{product?.title || "Product"}</td>
                          <td className="px-4 py-2.5 text-right">
                            {product ? <Currency value={product.selling_price} /> : "—"}
                            {isPack(product) ? <span className="block text-xs text-slate-500">pack {formatCurrency(product.pack_selling_price)}</span> : null}
                          </td>
                          <td className="px-4 py-2.5 text-xs">{isPack(product) ? SALE_UNIT_LABEL[effectiveSaleUnit(product, t.sale_unit, selected.sale_unit)] : "Single item"}</td>
                          {selected.type === "flash_sale" ? (
                            <td className="px-4 py-2.5 text-right font-semibold">
                              {t.promo_price == null && t.promo_pack_price == null ? discountText(selected) : null}
                              {t.promo_price != null ? <span className="block"><Currency value={t.promo_price} /></span> : null}
                              {t.promo_pack_price != null ? <span className="block text-xs">pack <Currency value={t.promo_pack_price} /></span> : null}
                            </td>
                          ) : null}
                          {selected.type === "bogo" ? <td className="px-4 py-2.5">{t.free_product_id ? productById.get(t.free_product_id)?.title || "Product" : "Same product"}</td> : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No single products.</p>
            )}

            <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-900">Categories ({categoryTargets(selected).length})</h3>
            {categoryTargets(selected).length ? (
              <div className="flex flex-wrap gap-2">
                {categoryTargets(selected).map((t) => (
                  <Pill key={t.id} tone="sky" dot={false}>{categoryById.get(t.category_id)?.name || "Category"}</Pill>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No categories.</p>
            )}
          </div>
        ) : null}
      </Modal>
    </section>
  )
}

// The old name, for any import still using it.
export const OffersPage = DiscountsPage
