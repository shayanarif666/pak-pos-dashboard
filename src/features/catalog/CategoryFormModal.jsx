import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useLocationsQuery, useSaveCategory } from "./catalogQuery.jsx"
import { LocationScopeField, scopePayload } from "../scope/LocationScopeField.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Select } from "../../ui/Select.jsx"
import { useToast } from "../../ui/Toast.jsx"

const empty = {
  name: "",
  tax_name: "",
  tax_type: "",
  tax_value: "",
  discount_name: "",
  discount_type: "",
  discount_value: "",
  location_scope: "all",
  location_ids: [],
}

function toForm(row) {
  if (!row) return empty
  return {
    name: row.name || "",
    tax_name: row.tax_name || "",
    tax_type: row.tax_type || "",
    tax_value: row.tax_value ?? "",
    discount_name: row.discount_name || "",
    discount_type: row.discount_type || "",
    discount_value: row.discount_value ?? "",
    location_scope: row.location_scope || "all",
    location_ids: row.location_ids || [],
  }
}

function payload(form, isAdmin) {
  const tax = Boolean(form.tax_type)
  const discount = Boolean(form.discount_type)
  return {
    name: form.name.trim(),
    tax_type: tax ? form.tax_type : null,
    tax_value: tax ? Number(form.tax_value) : null,
    tax_name: tax ? form.tax_name.trim() || null : null,
    discount_type: discount ? form.discount_type : null,
    discount_value: discount ? Number(form.discount_value) : null,
    discount_name: discount ? form.discount_name.trim() || null : null,
    // Only a store admin picks locations; a manager's category is for their own location.
    ...(isAdmin ? scopePayload(form) : {}),
  }
}

/** Create (category = null) or edit a category: name, tax, discount and where it is sold. */
export function CategoryFormModal({ open, onClose, category = null, categories = [], onSaved }) {
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const { toast } = useToast()
  const saveCategory = useSaveCategory()
  const locationsQuery = useLocationsQuery({ enabled: isAdmin && open })
  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setForm(toForm(category))
    setError("")
  }, [open, category])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function save(event) {
    event.preventDefault()
    setError("")
    if (!form.name.trim()) return setError("Name is required.")
    if (form.tax_type && form.tax_value === "") return setError("Enter the tax value, or set the tax to None.")
    if (form.discount_type && form.discount_value === "") return setError("Enter the discount value, or set the discount to None.")
    if (form.tax_type === "percentage" && Number(form.tax_value) > 100) return setError("A tax percentage cannot be over 100.")
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) return setError("A discount percentage cannot be over 100.")
    if (isAdmin && form.location_scope === "selected" && !form.location_ids.length) {
      return setError("Pick at least one location, or choose All locations.")
    }
    try {
      const json = await saveCategory.mutateAsync({ id: category?.id, body: payload(form, isAdmin) })
      toast(category ? "Category updated" : "Category created")
      onSaved?.(json.data)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal open={Boolean(open)} onClose={onClose}>
      <form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{category ? `Edit ${category.name}` : "New category"}</h2>
          <button type="button" className="text-slate-600 hover:text-brand-700" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4">
          <Input label="Name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Beverages" />

          <fieldset className="rounded-2xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium text-slate-700">Category tax</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Type" value={form.tax_type} onChange={(e) => set("tax_type", e.target.value)}>
                <option value="">None</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (Rs per unit)</option>
              </Select>
              <Input label="Value" type="number" min="0" step="0.01" disabled={!form.tax_type} value={form.tax_value} onChange={(e) => set("tax_value", e.target.value)} />
              <Input label="Name" disabled={!form.tax_type} value={form.tax_name} onChange={(e) => set("tax_name", e.target.value)} placeholder="GST" />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium text-slate-700">Category discount</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Type" value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)}>
                <option value="">None</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (Rs off)</option>
              </Select>
              <Input label="Value" type="number" min="0" step="0.01" disabled={!form.discount_type} value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} />
              <Input label="Name" disabled={!form.discount_type} value={form.discount_name} onChange={(e) => set("discount_name", e.target.value)} placeholder="Eid Sale" />
            </div>
          </fieldset>

          {isAdmin ? (
            <LocationScopeField
              title="Sold at"
              value={form}
              locations={locations}
              onChange={(next) => setForm((current) => ({ ...current, location_scope: next.location_scope, location_ids: next.location_ids }))}
            />
          ) : category ? null : (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">This category is added for your location.</p>
          )}

        </div>

        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saveCategory.isPending}>{saveCategory.isPending ? "Saving…" : category ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  )
}
