import { useState } from "react"
import { Link } from "react-router-dom"
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useLocationsQuery } from "../../features/catalog/catalogQuery.jsx"
import {
  useDeleteSupplier,
  useSaveSupplier,
  useSuppliersQuery,
} from "../../features/inventory/inventoryQuery.js"
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
  phone: "",
  email: "",
  address: "",
  payment_terms: "",
  is_active: true,
  location_scope: "all",
  location_ids: [],
}

export function SuppliersPage() {
  const { toast, confirmToast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const [locationFilter, setLocationFilter] = useState("")
  const suppliersQuery = useSuppliersQuery(locationFilter ? { location_id: locationFilter } : {})
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const saveSupplier = useSaveSupplier()
  const deleteSupplier = useDeleteSupplier()
  const rows = suppliersQuery.data || []
  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState("")

  function openCreate() {
    setEditingId(null)
    setForm(empty)
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      name: row.name || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      payment_terms: row.payment_terms || "",
      is_active: row.is_active !== false,
      location_scope: row.location_scope || "all",
      location_ids: row.location_ids || [],
    })
    setError("")
    setShowForm(true)
  }

  function toggleLocation(id, checked) {
    setForm((current) => ({
      ...current,
      location_ids: checked
        ? [...new Set([...current.location_ids, id])]
        : current.location_ids.filter((value) => value !== id),
    }))
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    if (isAdmin && form.location_scope === "selected" && !form.location_ids.length) {
      setError("Pick at least one location, or choose All locations.")
      return
    }
    try {
      await saveSupplier.mutateAsync({
        id: editingId,
        body: {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          payment_terms: form.payment_terms.trim() || null,
          // Managers always add suppliers for their own branch (set by the API).
          ...(isAdmin
            ? {
              location_scope: form.location_scope,
              location_ids: form.location_scope === "selected" ? form.location_ids : [],
            }
            : {}),
          ...(editingId ? { is_active: form.is_active } : {}),
        },
      })
      toast(editingId ? "Supplier updated" : "Supplier created")
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(row) {
    const ok = await confirmToast({
      title: "Deactivate supplier?",
      message: `${row.name} will be marked inactive.`,
      confirmLabel: "Deactivate",
    })
    if (!ok) return
    try {
      await deleteSupplier.mutateAsync(row.id)
      toast("Supplier deactivated")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Vendors, the branches they supply, and their ledgers."
              : "Vendors that supply your branch."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {isAdmin ? (
            <Select
              label="Location"
              className="min-w-48"
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add supplier
          </Button>
        </div>
      </div>

      {suppliersQuery.isPending ? <PageLoader label="Loading suppliers…" /> : null}
      {suppliersQuery.error ? (
        <p className="mb-4 text-sm text-rose-700">{suppliersQuery.error.message}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/suppliers/${row.id}`} className="text-lg font-semibold text-slate-900 hover:text-brand-700">
                  {row.name}
                </Link>
                <p className="text-sm text-slate-600">{row.phone || row.email || "No contact"}</p>
              </div>
              <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Off"}</Pill>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.location_scope === "selected" ? (
                (row.locations || []).map((location) => (
                  <Pill key={location.id} tone="sky" dot={false}>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {location.name}
                    </div>
                  </Pill>
                ))
              ) : (
                <Pill tone="brand" dot={false}>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    All locations
                  </div>
                </Pill>
              )}
            </div>
            {row.payment_terms ? <p className="mt-3 text-sm text-slate-500">Terms: {row.payment_terms}</p> : null}
            <div className="mt-5 flex gap-2">
              <Button variant="icon" aria-label="Edit supplier" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="icon" aria-label="Deactivate supplier" onClick={() => remove(row)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!suppliersQuery.isPending && !rows.length ? (
        <p className="mt-8 text-sm text-slate-500">
          {locationFilter ? "No suppliers deliver to this location." : "No suppliers yet."}
        </p>
      ) : null}

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
        <form
          onSubmit={save}
          className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? "Edit supplier" : "New supplier"}
            </h2>
            <button type="button" className="text-slate-600" onClick={() => setShowForm(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
          <div className="grid gap-3">
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Textarea
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <Input
              label="Payment terms"
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
            />

            {isAdmin ? (
              <fieldset className="rounded-2xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-medium text-slate-700">Supplies to</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ScopeOption
                    checked={form.location_scope === "all"}
                    title="All locations"
                    hint="Every branch, including new ones"
                    onSelect={() => setForm({ ...form, location_scope: "all" })}
                  />
                  <ScopeOption
                    checked={form.location_scope === "selected"}
                    title="Specific locations"
                    hint="One branch or a few branches"
                    onSelect={() => setForm({ ...form, location_scope: "selected" })}
                  />
                </div>
                {form.location_scope === "selected" ? (
                  <div className="mt-3 grid gap-2">
                    {locations.map((row) => (
                      <Checkbox
                        key={row.id}
                        label={row.name}
                        checked={form.location_ids.includes(row.id)}
                        onChange={(e) => toggleLocation(row.id, e.target.checked)}
                      />
                    ))}
                    {!locations.length ? (
                      <p className="text-sm text-slate-500">No active locations yet.</p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      {form.location_ids.length} of {locations.length} selected
                    </p>
                  </div>
                ) : null}
              </fieldset>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This supplier is added for your branch.
              </p>
            )}

            {editingId ? (
              <Checkbox
                label="Active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
            ) : null}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveSupplier.isPending}>
              {editingId ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

function ScopeOption({ checked, title, hint, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={[
        "rounded-xl border px-3 py-2.5 text-left transition",
        checked
          ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
          : "border-slate-200 bg-white hover:border-brand-300",
      ].join(" ")}
    >
      <span className="block text-sm font-semibold text-slate-900">{title}</span>
      <span className="block text-xs text-slate-500">{hint}</span>
    </button>
  )
}
