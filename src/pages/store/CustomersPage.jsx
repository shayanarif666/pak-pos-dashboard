import { useMemo, useState } from "react"
import { Eye, Pencil, Plus, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useLocationsQuery } from "../../features/catalog/catalogQuery.jsx"
import {
  useAddCustomerCredit,
  useCustomerCreditQuery,
  useCustomersQuery,
  useSaveCustomer,
} from "../../features/customers/customerQuery.js"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

const emptyCustomer = {
  name: "",
  phone: "",
  email: "",
  location_id: "",
  total_debt: "",
  remaining_debt: "",
  debt_notes: "",
  is_active: true,
  is_pos_visible: true,
  is_web_visible: true,
}

const emptyCredit = {
  entry_type: "debit",
  amount: "",
  due_date: "",
  note: "",
}

export function CustomersPage() {
  const { user, location } = useAuth()
  const { toast } = useToast()
  const [q, setQ] = useState("")
  const [filters, setFilters] = useState({ q: "" })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyCustomer)
  const [creditForm, setCreditForm] = useState(emptyCredit)
  const [error, setError] = useState("")

  const customersQuery = useCustomersQuery(filters)
  const locationsQuery = useLocationsQuery()
  const saveCustomer = useSaveCustomer()
  const addCredit = useAddCustomerCredit()
  const creditQuery = useCustomerCreditQuery(selected?.id, { enabled: Boolean(selected) })

  const rows = customersQuery.data || []
  const locations = locationsQuery.data || []
  const locationName = useMemo(
    () => Object.fromEntries(locations.map((row) => [row.id, row.name])),
    [locations]
  )

  function search(event) {
    event.preventDefault()
    setFilters({ q })
  }

  function openCreate() {
    setEditingId(null)
    setForm({
      ...emptyCustomer,
      location_id: user.role === "manager" ? location?.id || "" : "",
    })
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      name: row.name || "",
      phone: row.phone || "",
      email: row.email || "",
      location_id: row.location_id || "",
      total_debt: row.total_debt ?? "",
      remaining_debt: row.remaining_debt ?? "",
      debt_notes: row.debt_notes || "",
      is_active: row.is_active !== false,
      is_pos_visible: row.is_pos_visible !== false,
      is_web_visible: row.is_web_visible !== false,
    })
    setError("")
    setShowForm(true)
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      await saveCustomer.mutateAsync({
        id: editingId,
        body: {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          location_id: form.location_id || null,
          total_debt: form.total_debt === "" ? null : Number(form.total_debt),
          remaining_debt: form.remaining_debt === "" ? null : Number(form.remaining_debt),
          debt_notes: form.debt_notes.trim() || null,
          is_pos_visible: form.is_pos_visible,
          is_web_visible: form.is_web_visible,
          ...(editingId ? { is_active: form.is_active } : {}),
        },
      })
      toast(editingId ? "Customer updated" : "Customer created")
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveCredit(event) {
    event.preventDefault()
    if (!selected) return
    setError("")
    try {
      await addCredit.mutateAsync({
        id: selected.id,
        body: {
          entry_type: creditForm.entry_type,
          amount: Number(creditForm.amount),
          due_date: creditForm.due_date || null,
          note: creditForm.note.trim() || null,
        },
      })
      toast("Credit entry recorded")
      setCreditForm(emptyCredit)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CRM</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Customer profiles, contact details, and udhaar ledger.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add customer
        </Button>
      </div>

      <form
        onSubmit={search}
        className="mb-6 grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto]"
      >
        <Input
          label="Search"
          placeholder="Name, phone, email"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" variant="ghost" className="w-full">
            Filter
          </Button>
        </div>
      </form>

      {customersQuery.isPending ? <PageLoader label="Loading customers…" /> : null}
      {customersQuery.error ? <p className="mb-4 text-sm text-rose-700">{customersQuery.error.message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900">{row.name}</h2>
                <p className="truncate text-sm text-slate-600">{row.phone || row.email || "No contact"}</p>
                <p className="text-xs text-slate-500">
                  {row.location_id ? locationName[row.location_id] || "Assigned location" : "Store-wide"}
                </p>
              </div>
              <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Off"}</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Pill tone={Number(row.remaining_debt || 0) > 0 ? "amber" : "zinc"}>
                Due <Currency value={row.remaining_debt || 0} />
              </Pill>
              <Pill tone="violet">
                Total <Currency value={row.total_debt || 0} />
              </Pill>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="icon" aria-label="View customer" onClick={() => setSelected(row)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="icon" aria-label="Edit customer" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!customersQuery.isPending && !rows.length ? (
        <p className="mt-8 text-sm text-slate-500">No customers found.</p>
      ) : null}

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="w-full max-w-2xl rounded-3xl border border-slate-300 bg-white p-6">
            <ModalHeader title={editingId ? "Edit customer" : "New customer"} onClose={() => setShowForm(false)} />
            {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Select
                label="Location"
                value={form.location_id}
                onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                disabled={user.role === "manager"}
              >
                <option value="">Store-wide</option>
                {locations.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Total debt"
                type="number"
                min="0"
                step="0.01"
                value={form.total_debt}
                onChange={(e) => setForm({ ...form, total_debt: e.target.value })}
              />
              <Input
                label="Remaining debt"
                type="number"
                min="0"
                step="0.01"
                value={form.remaining_debt}
                onChange={(e) => setForm({ ...form, remaining_debt: e.target.value })}
              />
              <Textarea
                className="md:col-span-2"
                label="Debt notes"
                value={form.debt_notes}
                onChange={(e) => setForm({ ...form, debt_notes: e.target.value })}
              />
              <Checkbox
                label="POS visible"
                checked={form.is_pos_visible}
                onChange={(e) => setForm({ ...form, is_pos_visible: e.target.checked })}
              />
              <Checkbox
                label="Web visible"
                checked={form.is_web_visible}
                onChange={(e) => setForm({ ...form, is_web_visible: e.target.checked })}
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
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saveCustomer.isPending}>{editingId ? "Save" : "Create"}</Button>
            </div>
          </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="w-full max-w-3xl rounded-3xl border border-slate-300 bg-white p-6">
            <ModalHeader title={selected.name} onClose={() => setSelected(null)} />
            {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <Info label="Phone" value={selected.phone || "—"} />
              <Info label="Email" value={selected.email || "—"} />
              <Info label="Remaining" value={<Currency value={selected.remaining_debt || 0} />} />
            </div>
            <form onSubmit={saveCredit} className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[160px_1fr_1fr]">
              <Select label="Type" value={creditForm.entry_type} onChange={(e) => setCreditForm({ ...creditForm, entry_type: e.target.value })}>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </Select>
              <Input
                label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={creditForm.amount}
                onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
              />
              <Input
                label="Due date"
                type="date"
                value={creditForm.due_date}
                onChange={(e) => setCreditForm({ ...creditForm, due_date: e.target.value })}
              />
              <Input
                className="md:col-span-2"
                label="Note"
                value={creditForm.note}
                onChange={(e) => setCreditForm({ ...creditForm, note: e.target.value })}
              />
              <div className="flex items-end">
                <Button type="submit" disabled={addCredit.isPending}>Add ledger entry</Button>
              </div>
            </form>
            {creditQuery.isPending ? <PageLoader label="Loading credit ledger…" /> : null}
            <div className="grid gap-2">
              {(creditQuery.data || []).map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <Pill tone={entry.entry_type === "credit" ? "emerald" : "amber"}>{entry.entry_type}</Pill>
                    {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
                    <p className="text-xs text-slate-500">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}</p>
                  </div>
                  <p className="font-semibold text-slate-900"><Currency value={entry.amount} /></p>
                </div>
              ))}
            </div>
            {!creditQuery.isPending && !(creditQuery.data || []).length ? (
              <p className="text-sm text-slate-500">No credit entries yet.</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  )
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
