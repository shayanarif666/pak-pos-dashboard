import { useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useBundleDiscountsQuery, useDeleteBundleDiscount, useSaveBundleDiscount } from "../../features/discounts/discountQuery.js"
import { Button } from "../../ui/Button.jsx"
import { formatCurrency } from "../../ui/Currency.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Input } from "../../ui/Input.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { Select } from "../../ui/Select.jsx"
import { Switch } from "../../ui/Switch.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { discountAmountText } from "./OrderDiscountsPage.jsx"

/*
 * Bundle Discounts: a discount on selling a whole pack / carton, e.g. the crockery carton at
 * Rs. 5000 with 10% off. { name, products: [pack products], discount_type, discount_value,
 * start_at, end_at, is_active }.
 */

const emptyForm = { name: "", products: [], discount_type: "percentage", discount_value: "", start_at: "", end_at: "", is_active: true }

const isPack = (product) => Boolean(product?.is_pack_product) && Number(product?.pack_size) >= 2

function toLocalInput(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const shortDate = (value) => (value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "Open")

function stateOf(row, now = Date.now()) {
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

export function BundleDiscountsPage() {
  const { toast, confirmToast } = useToast()
  const query = useBundleDiscountsQuery()
  const productsQuery = useProductsQuery({}, { sellable: true })
  const save = useSaveBundleDiscount()
  const remove = useDeleteBundleDiscount()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [toggling, setToggling] = useState({})

  const rows = query.data || []
  const packProducts = useMemo(() => (productsQuery.data || []).filter((row) => !row.has_variants && isPack(row)), [productsQuery.data])
  const productById = useMemo(() => new Map((productsQuery.data || []).map((row) => [row.id, row])), [productsQuery.data])
  const shownProducts = search.trim() ? packProducts.filter((row) => row.title.toLowerCase().includes(search.trim().toLowerCase())) : packProducts

  const productNames = (row) => (row.product_ids || []).map((id) => productById.get(id)?.title || "Product")

  function openCreate() {
    setForm(emptyForm)
    setSearch("")
    setError("")
    setEditing({ id: null })
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      products: row.product_ids || [],
      discount_type: row.discount_type,
      discount_value: String(row.discount_value),
      start_at: toLocalInput(row.start_at),
      end_at: toLocalInput(row.end_at),
      is_active: Boolean(row.is_active),
    })
    setSearch("")
    setError("")
    setEditing({ id: row.id })
  }

  const toggleProduct = (id) =>
    setForm((current) => ({ ...current, products: current.products.includes(id) ? current.products.filter((p) => p !== id) : [...current.products, id] }))

  async function submit(event) {
    event.preventDefault()
    setError("")
    if (!form.name.trim()) return setError("Give the bundle discount a name.")
    if (!form.products.length) return setError("Pick at least one pack product.")
    if (!(Number(form.discount_value) > 0)) return setError("Enter the discount amount.")
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) return setError("A percentage cannot be over 100.")
    if (form.start_at && form.end_at && form.end_at < form.start_at) return setError("The end must be after the start.")
    try {
      await save.mutateAsync({
        id: editing.id,
        body: {
          name: form.name.trim(),
          products: form.products,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
          end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
          is_active: form.is_active,
        },
      })
      toast(editing.id ? "Bundle discount updated" : "Bundle discount added")
      setEditing(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function setActive(row, next) {
    setToggling((current) => ({ ...current, [row.id]: true }))
    try {
      await save.mutateAsync({ id: row.id, body: { is_active: next } })
      toast(next ? `${row.name} is active` : `${row.name} is inactive`)
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setToggling((current) => ({ ...current, [row.id]: false }))
    }
  }

  async function del(row) {
    const ok = await confirmToast({ title: `Delete ${row.name}?`, message: "It leaves the list and the POS.", confirmLabel: "Delete" })
    if (!ok) return
    try {
      await remove.mutateAsync(row.id)
      toast(`${row.name} deleted`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const now = Date.now()
  return (
    <section className="space-y-6">
      <PageHeader
        section="Discounts"
        title="Bundle Discounts"
        description="A discount for selling a whole pack or carton, for example the crockery carton at Rs. 5000 with 10% off. It applies when the full pack is sold."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add bundle discount</Button>}
      />
      <StatCards
        items={[
          { label: "Bundle discounts", value: rows.length },
          { label: "Running now", value: rows.filter((row) => stateOf(row, now) === "running").length },
          { label: "Scheduled", value: rows.filter((row) => stateOf(row, now) === "scheduled").length },
          { label: "Inactive", value: rows.filter((row) => !row.is_active).length, hint: `${rows.filter((row) => stateOf(row, now) === "expired").length} expired` },
        ]}
      />
      <DataTable
        title="Bundle discounts"
        columns={[
          { key: "name", header: "Bundle name", sortValue: (row) => row.name.toLowerCase(), render: (row) => <div className="min-w-32"><p className="font-medium text-slate-900">{row.name}</p><p className="text-xs text-slate-500">#{row.bundle_number}</p></div> },
          {
            key: "products",
            header: "Pack products",
            sortable: false,
            render: (row) => {
              const names = productNames(row)
              return <span title={names.join(", ")}>{names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ") || "—"}</span>
            },
          },
          { key: "discount", header: "Discount", sortValue: (row) => Number(row.discount_value), render: (row) => <span className="font-semibold text-brand-700">{discountAmountText(row)}</span> },
          {
            key: "window",
            header: "Runs",
            sortValue: (row) => row.start_at || "",
            render: (row) => (
              <div className="whitespace-nowrap text-xs text-slate-700">
                <p>{shortDate(row.start_at)}</p>
                <p className="text-slate-500">to {shortDate(row.end_at)}</p>
              </div>
            ),
          },
          { key: "state", header: "Status", sortValue: (row) => stateOf(row, now), render: (row) => <Pill tone={STATE_PILL[stateOf(row, now)].tone}>{STATE_PILL[stateOf(row, now)].label}</Pill> },
          {
            key: "is_active",
            header: "Active",
            sortValue: (row) => (row.is_active ? 1 : 0),
            render: (row) => <Switch checked={Boolean(row.is_active)} disabled={Boolean(toggling[row.id])} label={`${row.is_active ? "Turn off" : "Turn on"} ${row.name}`} onChange={(next) => setActive(row, next)} />,
          },
          {
            key: "actions",
            header: "",
            sortable: false,
            render: (row) => (
              <div className="flex justify-end gap-1">
                <Button variant="icon" aria-label="Edit bundle discount" title="Edit" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="icon" aria-label="Delete bundle discount" title="Delete" onClick={() => del(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
              </div>
            ),
          },
        ]}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        search={{ placeholder: "Search bundle or product…", text: (row) => `${row.name} ${row.bundle_number} ${productNames(row).join(" ")}` }}
        filters={[{ key: "status", label: "Status", options: Object.entries(STATE_PILL).map(([value, state]) => ({ value, label: state.label })), match: (row, value) => stateOf(row, now) === value }]}
        initialSort={{ key: "name", dir: "asc" }}
        emptyText="No bundle discounts yet."
      />

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} size="lg">
        {editing ? (
          <ModalCard as="form" title={editing.id ? "Edit bundle discount" : "New bundle discount"} onClose={() => setEditing(null)} onSubmit={submit}>
            <div className="grid gap-3">
              <Input label="Bundle name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Crockery carton" />

              <div className="rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">Pack products (the whole pack / carton)</span>
                  <span className="text-xs text-slate-500">{form.products.length} selected</span>
                </div>
                <div className="relative border-b border-slate-100">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none" />
                </div>
                <div className="max-h-56 overflow-y-auto p-1">
                  {shownProducts.map((row) => {
                    const checked = form.products.includes(row.id)
                    return (
                      <label key={row.id} className={["flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm", checked ? "bg-brand-50" : "hover:bg-slate-50"].join(" ")}>
                        <input type="checkbox" checked={checked} onChange={() => toggleProduct(row.id)} className="h-4 w-4 accent-[#135c4c]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-slate-900">{row.title}</span>
                          <span className="block truncate text-xs text-slate-500">Pack of {row.pack_size} · {formatCurrency(row.pack_selling_price)}</span>
                        </span>
                      </label>
                    )
                  })}
                  {!shownProducts.length ? <p className="px-3 py-4 text-center text-sm text-slate-500">{packProducts.length ? "Nothing matches." : "No pack products yet: a bundle discount is on a pack product."}</p> : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Discount type" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (Rs off each unit in the pack)</option>
                </Select>
                <Input label={form.discount_type === "percentage" ? "Discount amount (%)" : "Discount amount (Rs)"} type="number" min="0" step="0.01" required value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Starts" type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                <Input label="Ends" type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} label="Active" onChange={(next) => setForm({ ...form, is_active: next })} />
                <span className="text-sm text-slate-700">{form.is_active ? "Active" : "Inactive: never applied"}</span>
              </div>
            </div>
            {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : editing.id ? "Save" : "Add bundle discount"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>
    </section>
  )
}
