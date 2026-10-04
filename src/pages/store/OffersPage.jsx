import { useMemo, useState } from "react"
import { Eye, Pencil, Plus, Trash2, X } from "lucide-react"
import { useCategoriesQuery, useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import {
  useDeactivateOffer,
  useOffersQuery,
  useSaveOffer,
} from "../../features/promotions/promotionQuery.js"
import { formatCurrency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, StatusBadge } from "../../ui/Pill.jsx"

const emptyOffer = {
  name: "",
  type: "flash_sale",
  apply_to: "product",
  location_id: "",
  discount_type: "percentage",
  discount_value: "",
  min_qty: "",
  buy_qty: "",
  get_qty: "",
  start_at: "",
  end_at: "",
  is_active: true,
  target_id: "",
  free_product_id: "",
  promo_price: "",
}

export function OffersPage() {
  const { toast, confirmToast } = useToast()
  const [type, setType] = useState("")
  const [filters, setFilters] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyOffer)
  const [error, setError] = useState("")

  const offersQuery = useOffersQuery(filters)
  const productsQuery = useProductsQuery()
  const categoriesQuery = useCategoriesQuery()
  const locationsQuery = useLocationsQuery()
  const saveOffer = useSaveOffer()
  const deactivate = useDeactivateOffer()

  const offers = offersQuery.data || []
  const products = productsQuery.data || []
  const categories = categoriesQuery.data || []
  const locations = locationsQuery.data || []
  const productName = useMemo(() => Object.fromEntries(products.map((row) => [row.id, row.title])), [products])
  const categoryName = useMemo(() => Object.fromEntries(categories.map((row) => [row.id, row.name])), [categories])
  const locationName = useMemo(() => Object.fromEntries(locations.map((row) => [row.id, row.name])), [locations])

  function applyFilters(event) {
    event.preventDefault()
    setFilters({ type })
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyOffer)
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    const target = row.targets?.[0] || {}
    setEditingId(row.id)
    setForm({
      name: row.name || "",
      type: row.type || "flash_sale",
      apply_to: row.apply_to || "product",
      location_id: row.location_id || "",
      discount_type: row.discount_type || "percentage",
      discount_value: row.discount_value ?? "",
      min_qty: row.min_qty ?? "",
      buy_qty: row.buy_qty ?? "",
      get_qty: row.get_qty ?? "",
      start_at: toLocalInput(row.start_at),
      end_at: toLocalInput(row.end_at),
      is_active: row.is_active !== false,
      target_id: row.apply_to === "category" ? target.category_id || "" : target.product_id || "",
      free_product_id: target.free_product_id || "",
      promo_price: target.promo_price ?? "",
    })
    setError("")
    setShowForm(true)
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      const body = buildOfferBody(form)
      const target = buildTarget(form)
      await saveOffer.mutateAsync({
        id: editingId,
        body,
        targets: target ? [target] : [],
      })
      toast(editingId ? "Offer updated" : "Offer created")
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(row) {
    const ok = await confirmToast({
      title: "Deactivate offer?",
      message: `${row.name} will stop applying at checkout.`,
      confirmLabel: "Deactivate",
    })
    if (!ok) return
    try {
      await deactivate.mutateAsync(row.id)
      toast("Offer deactivated")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Promotions</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Offers</h1>
          <p className="mt-1 text-sm text-slate-500">Flash, bulk, BOGO, and promotional pricing.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add offer
        </Button>
      </div>

      <form onSubmit={applyFilters} className="mb-6 grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 md:grid-cols-[220px_auto]">
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All offers</option>
          <option value="flash_sale">Flash sale</option>
          <option value="bulk_discount">Bulk discount</option>
          <option value="bogo">BOGO</option>
          <option value="promotional">Promotional</option>
        </Select>
        <div className="flex items-end">
          <Button type="submit" variant="ghost">Filter</Button>
        </div>
      </form>

      {offersQuery.isPending ? <PageLoader label="Loading offers…" /> : null}
      {offersQuery.error ? <p className="mb-4 text-sm text-rose-700">{offersQuery.error.message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.map((row) => (
          <article key={row.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900">{row.name}</h2>
                <p className="text-sm text-slate-600">{row.apply_to} target · {row.location_id ? locationName[row.location_id] || "Location" : "All locations"}</p>
              </div>
              <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Off"}</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <StatusBadge value={row.type} />
              {row.discount_value != null ? (
                <Pill tone="violet">
                  {row.discount_type === "percentage"
                    ? `${row.discount_value}%`
                    : formatCurrency(row.discount_value)}
                </Pill>
              ) : null}
              {row.min_qty != null ? <Pill tone="amber">Min {row.min_qty}</Pill> : null}
              {row.buy_qty ? <Pill tone="sky">Buy {row.buy_qty} get {row.get_qty}</Pill> : null}
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="icon" aria-label="View offer" onClick={() => setSelected(row)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="icon" aria-label="Edit offer" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="icon" aria-label="Deactivate offer" onClick={() => remove(row)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!offersQuery.isPending && !offers.length ? <p className="mt-8 text-sm text-slate-500">No offers found.</p> : null}

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="w-full max-w-3xl rounded-3xl border border-slate-300 bg-white p-6">
            <ModalHeader title={editingId ? "Edit offer" : "New offer"} onClose={() => setShowForm(false)} />
            {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Select label="Type" value={form.type} onChange={(e) => setForm(normalizeOfferForm({ ...form, type: e.target.value }))}>
                <option value="flash_sale">Flash sale</option>
                <option value="bulk_discount">Bulk discount</option>
                <option value="bogo">BOGO</option>
                <option value="promotional">Promotional</option>
              </Select>
              <Select label="Apply to" value={form.apply_to} onChange={(e) => setForm({ ...form, apply_to: e.target.value, target_id: "" })}>
                <option value="product">Product</option>
                <option value="category">Category</option>
              </Select>
              <Select label="Location" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
                <option value="">All locations</option>
                {locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </Select>
              <Select label={form.apply_to === "category" ? "Category target" : "Product target"} required value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })}>
                <option value="">Select target</option>
                {(form.apply_to === "category" ? categories : products).map((row) => (
                  <option key={row.id} value={row.id}>{row.name || row.title}</option>
                ))}
              </Select>
              {form.type !== "bogo" ? (
                <>
                  <Select label="Discount type" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </Select>
                  <Input label="Discount value" type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
                </>
              ) : null}
              {form.type === "bulk_discount" ? (
                <Input label="Minimum quantity" type="number" min="0.01" step="0.01" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} />
              ) : null}
              {form.type === "bogo" ? (
                <>
                  <Input label="Buy quantity" type="number" min="1" step="1" value={form.buy_qty} onChange={(e) => setForm({ ...form, buy_qty: e.target.value })} />
                  <Input label="Get quantity" type="number" min="1" step="1" value={form.get_qty} onChange={(e) => setForm({ ...form, get_qty: e.target.value })} />
                  <Select label="Free product" value={form.free_product_id} onChange={(e) => setForm({ ...form, free_product_id: e.target.value })}>
                    <option value="">Same product</option>
                    {products.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
                  </Select>
                </>
              ) : null}
              {form.type === "flash_sale" ? (
                <Input label="Promo price" type="number" min="0" step="0.01" value={form.promo_price} onChange={(e) => setForm({ ...form, promo_price: e.target.value })} />
              ) : null}
              <Input label="Start" type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
              <Input label="End" type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
              <Checkbox label="Active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saveOffer.isPending}>{editingId ? "Save" : "Create"}</Button>
            </div>
          </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="w-full max-w-2xl rounded-3xl border border-slate-300 bg-white p-6">
            <ModalHeader title={selected.name} onClose={() => setSelected(null)} />
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Type" value={selected.type} />
              <Info label="Applies to" value={selected.apply_to} />
              <Info label="Discount" value={selected.discount_value == null ? "—" : `${selected.discount_value} ${selected.discount_type}`} />
              <Info label="Window" value={`${formatDate(selected.start_at)} → ${formatDate(selected.end_at)}`} />
            </div>
            <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-900">Targets</h3>
            <div className="grid gap-2">
              {(selected.targets || []).map((target) => (
                <div key={target.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {target.product_id ? productName[target.product_id] || target.product_id : categoryName[target.category_id] || target.category_id}
                  {target.promo_price != null ? ` · Promo ${formatCurrency(target.promo_price)}` : ""}
                  {target.free_product_id ? ` · Free ${productName[target.free_product_id] || target.free_product_id}` : ""}
                </div>
              ))}
              {!(selected.targets || []).length ? <p className="text-sm text-slate-500">No targets configured.</p> : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}

function normalizeOfferForm(next) {
  if (next.type === "bogo") {
    return { ...next, discount_type: "", discount_value: "", min_qty: "", promo_price: "" }
  }
  if (next.type === "bulk_discount") return { ...next, buy_qty: "", get_qty: "", promo_price: "" }
  return { ...next, buy_qty: "", get_qty: "", min_qty: "" }
}

function buildOfferBody(form) {
  return {
    name: form.name.trim(),
    type: form.type,
    apply_to: form.apply_to,
    location_id: form.location_id || null,
    discount_type: form.type === "bogo" ? null : form.discount_type || null,
    discount_value: form.type === "bogo" || form.discount_value === "" ? null : Number(form.discount_value),
    min_qty: form.type === "bulk_discount" ? Number(form.min_qty) : null,
    buy_qty: form.type === "bogo" ? Number(form.buy_qty) : null,
    get_qty: form.type === "bogo" ? Number(form.get_qty) : null,
    start_at: form.start_at || null,
    end_at: form.end_at || null,
    is_active: form.is_active,
  }
}

function buildTarget(form) {
  if (!form.target_id) return null
  return {
    product_id: form.apply_to === "product" ? form.target_id : null,
    category_id: form.apply_to === "category" ? form.target_id : null,
    free_product_id: form.type === "bogo" ? form.free_product_id || null : null,
    promo_price: form.type === "flash_sale" && form.promo_price !== "" ? Number(form.promo_price) : null,
  }
}

function toLocalInput(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 16)
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Open"
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <button type="button" className="text-slate-600 hover:text-brand-700" onClick={onClose}>
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
