import { useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import {
  useCategoriesQuery,
  useDeleteCategory,
  useProductsQuery,
  useSaveCategory,
} from "../../features/catalog/catalogQuery.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

const empty = {
  name: "",
  description: "",
  parent_category_id: "",
  tax_type: "",
  tax_value: "",
  discount_type: "",
  discount_value: "",
  sort_order: "0",
  is_active: true,
  is_pos_visible: true,
  is_web_visible: true,
}

function payload(form) {
  const body = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    parent_category_id: form.parent_category_id || null,
    sort_order: Number(form.sort_order || 0),
    is_active: Boolean(form.is_active),
    is_pos_visible: Boolean(form.is_pos_visible),
    is_web_visible: Boolean(form.is_web_visible),
  }
  if (form.tax_type) {
    body.tax_type = form.tax_type
    body.tax_value = Number(form.tax_value)
  } else {
    body.tax_type = null
    body.tax_value = null
  }
  if (form.discount_type) {
    body.discount_type = form.discount_type
    body.discount_value = Number(form.discount_value)
  } else {
    body.discount_type = null
    body.discount_value = null
  }
  return body
}

export function CategoriesPage() {
  const { toast, confirmToast } = useToast()
  const categoriesQuery = useCategoriesQuery()
  const saveCategory = useSaveCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const rows = categoriesQuery.data || []
  const [form, setForm] = useState(empty)
  const [imageFile, setImageFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const loading = categoriesQuery.isPending
  const productsQuery = useProductsQuery({})
  const productCount = new Map()
  for (const product of productsQuery.data || []) {
    productCount.set(product.category_id, (productCount.get(product.category_id) || 0) + 1)
  }
  const listError = categoriesQuery.error?.message || ""

  function openCreate() {
    setForm(empty)
    setImageFile(null)
    setEditingId(null)
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      name: row.name || "",
      description: row.description || "",
      parent_category_id: row.parent_category_id || "",
      tax_type: row.tax_type || "",
      tax_value: row.tax_value ?? "",
      discount_type: row.discount_type || "",
      discount_value: row.discount_value ?? "",
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active !== false,
      is_pos_visible: row.is_pos_visible !== false,
      is_web_visible: row.is_web_visible !== false,
    })
    setImageFile(null)
    setEditingId(row.id)
    setError("")
    setShowForm(true)
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      const body = payload(form)
      if (editingId) {
        await saveCategory.mutateAsync({ id: editingId, body, imageFile })
        toast("Category updated")
      } else {
        await saveCategory.mutateAsync({ body, imageFile })
        toast("Category created")
      }
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(row) {
    const ok = await confirmToast({
      title: "Delete category?",
      message: `Remove ${row.name}? Products using it cannot stay attached.`,
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await deleteCategoryMutation.mutateAsync(row.id)
      toast("Category deleted")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const parents = rows.filter((row) => row.id !== editingId)

  const parentName = (id) => rows.find((row) => row.id === id)?.name || "—"
  const percentOrRs = (type, value) =>
    type && value != null && value !== "" ? (type === "percentage" ? `${Number(value)}%` : `Rs ${Number(value)}`) : "—"

  const columns = [
    {
      key: "name",
      header: "Category",
      render: (row) => (
        <div className="flex min-w-44 items-center gap-3">
          {row.image_url ? (
            <img src={row.image_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] text-slate-400">No img</div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">#{row.category_number} · {row.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "parent", header: "Parent", sortValue: (row) => parentName(row.parent_category_id), render: (row) => (row.parent_category_id ? parentName(row.parent_category_id) : "—") },
    { key: "products", header: "Products", align: "right", sortValue: (row) => productCount.get(row.id) || 0, render: (row) => productCount.get(row.id) || 0 },
    { key: "tax", header: "Category tax", sortValue: (row) => Number(row.tax_value || 0), render: (row) => percentOrRs(row.tax_type, row.tax_value) },
    { key: "discount", header: "Discount", sortValue: (row) => Number(row.discount_value || 0), render: (row) => percentOrRs(row.discount_type, row.discount_value) },
    {
      key: "channels",
      header: "Shown on",
      sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          <Pill tone={row.is_pos_visible ? "sky" : "zinc"} dot={false}>POS</Pill>
          <Pill tone={row.is_web_visible ? "fuchsia" : "zinc"} dot={false}>Web</Pill>
        </div>
      ),
    },
    { key: "is_active", header: "Status", sortValue: (row) => (row.is_active ? 1 : 0), render: (row) => <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Off"}</Pill> },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="icon" aria-label="Edit category" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label="Delete category" onClick={() => remove(row)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Catalog"
        title="Categories"
        description="Shared across every location of this store. A category tax and discount apply to every product in it."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add category</Button>}
      />
      {error && !showForm ? <p className="text-sm text-rose-700">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={listError ? { message: listError } : null}
        search={{ placeholder: "Search category…", text: (row) => `${row.name} ${row.slug} ${row.category_number}` }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "off", label: "Off" }], match: (row, value) => (row.is_active ? "active" : "off") === value },
          { key: "tax", label: "Category tax", options: [{ value: "yes", label: "With tax" }, { value: "no", label: "No tax" }], match: (row, value) => (row.tax_type ? "yes" : "no") === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "name", dir: "asc" }}
        emptyText="No categories yet. Create one before adding products."
      />

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-2xl backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit category" : "New category"}
              </h2>
              <button type="button" className="text-slate-600 hover:text-brand-700" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
            <div className="grid gap-3">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Select
                label="Parent"
                value={form.parent_category_id}
                onChange={(e) => setForm({ ...form, parent_category_id: e.target.value })}
              >
                <option value="">None</option>
                {parents.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <Input
                label="Image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Tax type"
                  value={form.tax_type}
                  onChange={(e) => setForm({ ...form, tax_type: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </Select>
                <Input
                  label="Tax value"
                  type="number"
                  min="0"
                  value={form.tax_value}
                  onChange={(e) => setForm({ ...form, tax_value: e.target.value })}
                />
                <Select
                  label="Discount type"
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </Select>
                <Input
                  label="Discount value"
                  type="number"
                  min="0"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                />
              </div>
              <Input
                label="Sort order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
              <Checkbox
                label="Active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <Checkbox
                label="Visible on POS"
                checked={form.is_pos_visible}
                onChange={(e) => setForm({ ...form, is_pos_visible: e.target.checked })}
              />
              <Checkbox
                label="Visible on web"
                checked={form.is_web_visible}
                onChange={(e) => setForm({ ...form, is_web_visible: e.target.checked })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Save" : "Create"}</Button>
            </div>
          </form>
      </Modal>
    </section>
  )
}
