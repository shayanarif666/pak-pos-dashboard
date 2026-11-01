import { useMemo, useState } from "react"
import { Eye, Pencil, Plus, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useCategoriesQuery, useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useOffersQuery, useSaveOffer } from "../../features/promotions/promotionQuery.js"
import { LocationScopeField, LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
import { formatCurrency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { Select } from "../../ui/Select.jsx"
import { Switch } from "../../ui/Switch.jsx"
import { useToast } from "../../ui/Toast.jsx"

const TYPE_LABEL = {
  flash_sale: "Flash sale",
  bulk_discount: "Bulk discount",
  bogo: "BOGO",
  promotional: "Promotional",
}

const emptyOffer = {
  name: "",
  type: "flash_sale",
  apply_to: "product",
  location_scope: "all",
  location_ids: [],
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

function discountText(row) {
  if (row.type === "bogo") return `Buy ${row.buy_qty ?? "?"} get ${row.get_qty ?? "?"}`
  if (row.discount_value == null) return "—"
  return row.discount_type === "percentage" ? `${row.discount_value}%` : formatCurrency(row.discount_value)
}

export function OffersPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyOffer)
  const [error, setError] = useState("")
  const [toggling, setToggling] = useState({})

  const offersQuery = useOffersQuery()
  const productsQuery = useProductsQuery()
  const categoriesQuery = useCategoriesQuery()
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const saveOffer = useSaveOffer()

  const offers = offersQuery.data || []
  const products = productsQuery.data || []
  const categories = categoriesQuery.data || []
  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const productName = useMemo(() => Object.fromEntries(products.map((row) => [row.id, row.title])), [products])
  const categoryName = useMemo(() => Object.fromEntries(categories.map((row) => [row.id, row.name])), [categories])
  // Offers name their locations by number; the scope picker works with location UUIDs.
  const locationIdOfNumber = useMemo(
    () => Object.fromEntries((locationsQuery.data || []).map((row) => [String(row.location_number), row.id])),
    [locationsQuery.data]
  )

  function targetName(row) {
    const target = row.targets?.[0]
    if (!target) return "—"
    return target.product_id ? productName[target.product_id] || "Product" : categoryName[target.category_id] || "Category"
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
      location_scope: row.location_scope || "all",
      location_ids: (row.location_ids || []).map((number) => locationIdOfNumber[String(number)]).filter(Boolean),
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
    if (isAdmin && form.location_scope === "selected" && !form.location_ids.length) {
      setError("Pick at least one location, or choose All locations.")
      return
    }
    try {
      const target = buildTarget(form)
      await saveOffer.mutateAsync({
        id: editingId,
        body: buildOfferBody(form, isAdmin),
        targets: target ? [target] : [],
      })
      toast(editingId ? "Offer updated" : "Offer created")
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const now = Date.now()
  const columns = [
    {
      key: "name",
      header: "Offer",
      render: (row) => (
        <div className="min-w-44">
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">#{row.offer_number} · {TYPE_LABEL[row.type] || row.type}</p>
        </div>
      ),
    },
    {
      key: "target",
      header: "Applies to",
      sortValue: (row) => targetName(row),
      render: (row) => (
        <div>
          <p className="text-slate-900">{targetName(row)}</p>
          <p className="text-xs capitalize text-slate-500">{row.apply_to}</p>
        </div>
      ),
    },
    { key: "discount", header: "Discount", sortValue: (row) => Number(row.discount_value || 0), render: (row) => discountText(row) },
    {
      key: "window",
      header: "Runs",
      sortValue: (row) => row.start_at || "",
      render: (row) => (
        <span className="text-xs text-slate-600">
          {formatDate(row.start_at)} → {formatDate(row.end_at)}
        </span>
      ),
    },
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
        <Switch
          checked={Boolean(row.is_active)}
          disabled={Boolean(toggling[row.id])}
          label={row.is_active ? `Turn off ${row.name}` : `Turn on ${row.name}`}
          onChange={(next) => toggleActive(row, next)}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="icon" aria-label="View offer" onClick={() => setSelected(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label="Edit offer" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Promotions"
        title="Offers"
        description="Flash sales, bulk discounts, BOGO and promotions. Switch an offer off to stop it at checkout; switch it back on any time."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add offer</Button>}
      />

      <StatCards
        items={[
          { label: "Offers", value: offers.length },
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
        search={{ placeholder: "Search offer, product or category…", text: (row) => `${row.name} ${row.offer_number} ${targetName(row)}` }}
        filters={[
          { key: "type", label: "Type", options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })), match: (row, value) => row.type === value },
          { key: "status", label: "Status", options: Object.entries(STATE_PILL).map(([value, state]) => ({ value, label: state.label })), match: (row, value) => offerState(row, now) === value },
          { key: "apply_to", label: "Applies to", options: [{ value: "product", label: "Product" }, { value: "category", label: "Category" }], match: (row, value) => row.apply_to === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(row) => setSelected(row)}
        emptyText="No offers yet."
      />

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
        <form onSubmit={save} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6">
          <ModalHeader title={editingId ? "Edit offer" : "New offer"} onClose={() => setShowForm(false)} />
          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Type" value={form.type} onChange={(e) => setForm(normalizeOfferForm({ ...form, type: e.target.value }))}>
              {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select label="Apply to" value={form.apply_to} onChange={(e) => setForm({ ...form, apply_to: e.target.value, target_id: "" })}>
              <option value="product">Product</option>
              <option value="category">Category</option>
            </Select>
            <Select label={form.apply_to === "category" ? "Category" : "Product"} required value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })}>
              <option value="">Select {form.apply_to}</option>
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
            <div className="flex items-center gap-3 md:col-span-2">
              <Switch checked={form.is_active} label="Active" onChange={(next) => setForm({ ...form, is_active: next })} />
              <span className="text-sm text-slate-700">{form.is_active ? "Active — applies at checkout" : "Inactive — never applied"}</span>
            </div>
            <div className="md:col-span-2">
              {isAdmin ? (
                <LocationScopeField
                  title="Runs at"
                  value={form}
                  locations={locations}
                  onChange={(next) => setForm({ ...form, location_scope: next.location_scope, location_ids: next.location_ids })}
                />
              ) : editingId ? null : (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">This offer runs at your location.</p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saveOffer.isPending}>{editingId ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="w-full max-w-2xl rounded-3xl border border-slate-300 bg-white p-6">
            <ModalHeader title={selected.name} onClose={() => setSelected(null)} />
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Type" value={TYPE_LABEL[selected.type] || selected.type} />
              <Info label="Status" value={STATE_PILL[offerState(selected)].label} />
              <Info label="Applies to" value={`${targetName(selected)} (${selected.apply_to})`} />
              <Info label="Discount" value={discountText(selected)} />
              <Info label="Runs" value={`${formatDate(selected.start_at)} → ${formatDate(selected.end_at)}`} />
              <Info label="Locations" value={<LocationScopePills row={selected} />} />
            </div>
            <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-900">Targets</h3>
            <div className="grid gap-2">
              {(selected.targets || []).map((target) => (
                <div key={target.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {target.product_id ? productName[target.product_id] || "Product" : categoryName[target.category_id] || "Category"}
                  {target.promo_price != null ? ` · Promo ${formatCurrency(target.promo_price)}` : ""}
                  {target.free_product_id ? ` · Free ${productName[target.free_product_id] || "product"}` : ""}
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

function buildOfferBody(form, isAdmin) {
  const target = buildTarget(form)
  return {
    name: form.name.trim(),
    type: form.type,
    // What it applies to goes with the offer (the API sets apply_to from it).
    ...(target?.product_id
      ? { products: [{ product_id: target.product_id, promo_price: target.promo_price, free_product_id: target.free_product_id }] }
      : target?.category_id
        ? { categories: [target.category_id] }
        : {}),
    // Only a store admin picks locations; a manager's offer runs at their own location.
    ...(isAdmin
      ? {
          location_scope: form.location_scope,
          location_ids: form.location_scope === "selected" ? form.location_ids : [],
        }
      : {}),
    discount_type: form.type === "bogo" ? null : form.discount_type || null,
    discount_value: form.type === "bogo" || form.discount_value === "" ? null : Number(form.discount_value),
    min_qty: form.type === "bulk_discount" ? Number(form.min_qty) : null,
    buy_qty: form.type === "bogo" ? Number(form.buy_qty) : null,
    get_qty: form.type === "bogo" ? Number(form.get_qty) : null,
    start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
    end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
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
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}
