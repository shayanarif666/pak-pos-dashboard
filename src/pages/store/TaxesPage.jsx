import { useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useDeleteStoreTax, useSaveStoreTax, useStoreTaxesQuery } from "../../features/taxes/storeTaxQuery.js"
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

/*
 * Taxes: a tax defined once — { name, type, value, product_scope: all | selected, product_ids } —
 * charged on every product (all, including ones added later) or on the products picked here. A
 * product covers its variants; a variant can be picked on its own too.
 */

const emptyForm = { name: "", type: "percentage", value: "", product_scope: "all", product_ids: [], is_active: true }

const amountText = (row) => (row.type === "percentage" ? `${Number(row.value)}%` : `${formatCurrency(row.value)} / unit`)

/** The products a tax applies to, e.g. "Pepsi · 2L, Lux +2". */
function appliesText(row) {
  if (row.product_scope !== "selected") return "All products"
  const names = (row.products || []).map((p) => (p.variant ? `${p.title} · ${p.variant.name}` : p.title))
  if (!names.length) return "No products"
  return names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", ")
}

export function TaxesPage() {
  const { user } = useAuth()
  const canEdit = user?.role === "store_admin"
  const { toast, confirmToast } = useToast()
  const taxesQuery = useStoreTaxesQuery()
  const saveTax = useSaveStoreTax()
  const deleteTax = useDeleteStoreTax()
  // Products and variants (a parent with variants is picked whole, or one of its variants).
  const productsQuery = useProductsQuery({}, { enabled: canEdit })
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [toggling, setToggling] = useState({})

  const rows = taxesQuery.data || []
  // One option per product, and per variant under its product.
  const options = useMemo(
    () =>
      (productsQuery.data || [])
        .filter((row) => row.is_active !== false)
        .flatMap((product) => [
          { id: product.id, label: product.title, hint: product.has_variants ? "all variants" : product.sku },
          ...(product.variants || []).map((variant) => ({ id: variant.id, label: `${product.title} · ${variant.name}`, hint: "this variant", indent: true })),
        ]),
    [productsQuery.data]
  )
  const q = query.trim().toLowerCase()
  const shown = q ? options.filter((row) => row.label.toLowerCase().includes(q)) : options

  function openCreate() {
    setForm(emptyForm)
    setError("")
    setEditing({ id: null })
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      type: row.type,
      value: String(row.value),
      product_scope: row.product_scope,
      product_ids: (row.products || []).map((p) => p.uuid),
      is_active: row.is_active,
    })
    setError("")
    setEditing({ id: row.id })
  }

  const toggleProduct = (id) =>
    setForm((current) => ({
      ...current,
      product_ids: current.product_ids.includes(id) ? current.product_ids.filter((value) => value !== id) : [...current.product_ids, id],
    }))

  async function save(event) {
    event.preventDefault()
    setError("")
    if (!form.name.trim()) return setError("Give the tax a name.")
    if (form.value === "" || Number(form.value) < 0) return setError("Enter the tax value.")
    if (form.type === "percentage" && Number(form.value) > 100) return setError("A percentage cannot be over 100.")
    if (form.product_scope === "selected" && !form.product_ids.length) return setError("Pick at least one product, or choose All products.")
    const body = {
      name: form.name.trim(),
      type: form.type,
      value: Number(form.value),
      product_scope: form.product_scope,
      product_ids: form.product_scope === "selected" ? form.product_ids : [],
      is_active: form.is_active,
    }
    try {
      await saveTax.mutateAsync({ id: editing.id, body })
      toast(editing.id ? "Tax updated" : "Tax created")
      setEditing(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function setActive(row, next) {
    setToggling((current) => ({ ...current, [row.id]: true }))
    try {
      await saveTax.mutateAsync({ id: row.id, body: { is_active: next } })
      toast(next ? `${row.name} is charged again` : `${row.name} is switched off`)
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setToggling((current) => ({ ...current, [row.id]: false }))
    }
  }

  async function remove(row) {
    const ok = await confirmToast({ title: "Delete tax?", message: `${row.name} will no longer be charged on any product.`, confirmLabel: "Delete" })
    if (!ok) return
    try {
      await deleteTax.mutateAsync(row.id)
      toast(`${row.name} deleted`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const columns = [
    { key: "id", header: "Tax #", sortValue: (row) => row.id, render: (row) => <span className="font-semibold text-slate-900">#{row.id}</span> },
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: "value", header: "Amount", sortValue: (row) => Number(row.value), render: (row) => amountText(row) },
    {
      key: "applies",
      header: "Applies to",
      sortable: false,
      render: (row) => (
        <div className="max-w-80">
          <Pill tone={row.product_scope === "all" ? "brand" : "sky"} dot={false}>{row.product_scope === "all" ? "All products" : `${row.products.length} selected`}</Pill>
          {row.product_scope === "selected" ? <p className="mt-1 truncate text-xs text-slate-500">{appliesText(row)}</p> : null}
        </div>
      ),
    },
    {
      key: "is_active",
      header: "Active",
      sortValue: (row) => (row.is_active ? 1 : 0),
      render: (row) =>
        canEdit ? (
          <Switch checked={row.is_active} disabled={Boolean(toggling[row.id])} label={row.is_active ? `Switch off ${row.name}` : `Switch on ${row.name}`} onChange={(next) => setActive(row, next)} />
        ) : (
          <Pill tone={row.is_active ? "emerald" : "zinc"}>{row.is_active ? "Active" : "Off"}</Pill>
        ),
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "",
            sortable: false,
            render: (row) => (
              <div className="flex justify-end gap-1">
                <Button variant="icon" aria-label="Edit tax" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="icon" aria-label="Delete tax" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Settings"
        title="Taxes"
        description="A tax set once and charged on every product, or only on the products you pick. Charged on the discounted price, with each product's own taxes; a fixed amount is per unit."
        actions={canEdit ? <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add tax</Button> : null}
      />
      <StatCards
        items={[
          { label: "Taxes", value: rows.length },
          { label: "Active", value: rows.filter((row) => row.is_active).length },
          { label: "On every product", value: rows.filter((row) => row.product_scope === "all").length },
          { label: "On selected products", value: rows.filter((row) => row.product_scope === "selected").length },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={taxesQuery.isPending}
        error={taxesQuery.error}
        search={{ placeholder: "Search tax or product…", text: (row) => `${row.name} #${row.id} ${appliesText(row)}` }}
        filters={[
          { key: "scope", label: "Applies to", options: [{ value: "all", label: "All products" }, { value: "selected", label: "Selected products" }], match: (row, value) => row.product_scope === value },
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "off", label: "Off" }], match: (row, value) => (row.is_active ? "active" : "off") === value },
        ]}
        initialSort={{ key: "id", dir: "asc" }}
        emptyText="No taxes yet."
      />

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} size="lg">
        {editing ? (
          <ModalCard as="form" title={editing.id ? `Edit ${form.name || "tax"}` : "New tax"} onClose={() => setEditing(null)} onSubmit={save} className="w-full max-w-2xl">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GST" className="md:col-span-1" />
                <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (Rs per unit)</option>
                </Select>
                <Input label={form.type === "percentage" ? "Rate %" : "Amount Rs"} type="number" min="0" step="0.01" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "all", title: "All products", hint: "Every product, including ones added later" },
                  { value: "selected", title: "Selected products", hint: "Only the products picked below" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm({ ...form, product_scope: option.value })}
                    aria-pressed={form.product_scope === option.value}
                    className={[
                      "rounded-xl border px-3 py-2.5 text-left transition",
                      form.product_scope === option.value ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 bg-white hover:border-brand-300",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
                    <span className="block text-xs text-slate-500">{option.hint}</span>
                  </button>
                ))}
              </div>

              {form.product_scope === "selected" ? (
                <div className="rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">Products</span>
                    <span className="text-xs text-slate-500">{form.product_ids.length} selected</span>
                  </div>
                  <div className="relative border-b border-slate-100">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none" />
                  </div>
                  <div className="max-h-72 overflow-y-auto p-1">
                    {shown.map((row) => {
                      const checked = form.product_ids.includes(row.id)
                      return (
                        <label key={row.id} className={["flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm", row.indent ? "pl-8" : "", checked ? "bg-brand-50" : "hover:bg-slate-50"].join(" ")}>
                          <input type="checkbox" checked={checked} onChange={() => toggleProduct(row.id)} className="h-4 w-4 accent-[#135c4c]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-slate-900">{row.label}</span>
                            {row.hint ? <span className="block truncate text-xs text-slate-500">{row.hint}</span> : null}
                          </span>
                        </label>
                      )
                    })}
                    {!shown.length ? <p className="px-3 py-4 text-center text-sm text-slate-500">No products.</p> : null}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} label="Active" onChange={(next) => setForm({ ...form, is_active: next })} />
                <span className="text-sm text-slate-700">{form.is_active ? "Active — charged at checkout" : "Off — not charged"}</span>
              </div>
            </div>
            {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={saveTax.isPending}>{saveTax.isPending ? "Saving…" : editing.id ? "Save tax" : "Create tax"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>
    </section>
  )
}
