import { useState } from "react"
import { Link } from "react-router-dom"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import {
  useDeleteSupplier,
  useSaveSupplier,
  useSuppliersQuery,
} from "../../features/inventory/inventoryQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"

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
}

export function SuppliersPage() {
  const { toast, confirmToast } = useToast()
  const suppliersQuery = useSuppliersQuery()
  const saveSupplier = useSaveSupplier()
  const deleteSupplier = useDeleteSupplier()
  const rows = suppliersQuery.data || []
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
    })
    setError("")
    setShowForm(true)
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      await saveSupplier.mutateAsync({
        id: editingId,
        body: {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          payment_terms: form.payment_terms.trim() || null,
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
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">Store-wide vendors and their ledgers.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add supplier
        </Button>
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
            {row.payment_terms ? <p className="mt-3 text-sm text-slate-500">{row.payment_terms}</p> : null}
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
        <p className="mt-8 text-sm text-slate-500">No suppliers yet.</p>
      ) : null}

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
          <form
            onSubmit={save}
            className="w-full max-w-lg rounded-3xl border border-slate-300 bg-white p-6"
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
              <Button type="submit">{editingId ? "Save" : "Create"}</Button>
            </div>
          </form>
      </Modal>
    </section>
  )
}
