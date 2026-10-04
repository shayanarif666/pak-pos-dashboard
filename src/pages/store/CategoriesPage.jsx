import { useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import {
  useCategoriesQuery,
  useDeleteCategory,
  useSaveCategory,
} from "../../features/catalog/catalogQuery.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
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

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">Shared across every location of this store.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      {loading ? <PageLoader label="Loading categories…" /> : null}
      {(error || listError) && !showForm ? (
        <p className="mb-4 text-sm text-rose-700">{error || listError}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
          >
            <div className="flex items-start gap-3">
              {row.image_url ? (
                <img
                  src={row.image_url}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xs text-slate-500">
                  No img
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-slate-900">{row.name}</h2>
                <p className="truncate text-xs text-slate-500">{row.slug}</p>
              </div>
              <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Off"}</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Pill tone={row.is_pos_visible ? "sky" : "zinc"}>POS</Pill>
              <Pill tone={row.is_web_visible ? "fuchsia" : "zinc"}>Web</Pill>
              {row.tax_type ? (
                <Pill tone="amber">
                  Tax {row.tax_value}
                  {row.tax_type === "percentage" ? "%" : ""}
                </Pill>
              ) : null}
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="icon" aria-label="Edit category" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="icon" aria-label="Delete category" onClick={() => remove(row)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>

      {!loading && !rows.length ? (
        <p className="mt-8 text-sm text-slate-500">No categories yet. Create one before adding products.</p>
      ) : null}

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
