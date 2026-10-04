import { useMemo, useState } from "react"
import { BarChart3, Pencil, Plus, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useSaveStaff,
  useStaffQuery,
  useStaffSalesQuery,
} from "../../features/operations/operationsQuery.js"
import { useStoreLocationsQuery } from "../../features/people/peopleQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, StatusBadge, statusTone } from "../../ui/Pill.jsx"

const empty = {
  name: "",
  email: "",
  phone: "",
  password: "",
  pin: "",
  role: "cashier",
  location_id: "",
  is_active: true,
}

export function StaffPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user.role === "store_admin"
  const staffQuery = useStaffQuery()
  const locationsQuery = useStoreLocationsQuery({ enabled: isAdmin })
  const saveStaff = useSaveStaff()
  const rows = staffQuery.data || []
  const locations = locationsQuery.data || []
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState("")
  const [created, setCreated] = useState(null)
  const [salesFor, setSalesFor] = useState(null)

  const locationName = useMemo(() => {
    const map = new Map(locations.map((row) => [row.id, row.name]))
    return (id) => map.get(id) || (id ? "Branch" : "All branches")
  }, [locations])

  function openCreate() {
    setEditingId(null)
    setForm(empty)
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      ...empty,
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      role: row.role,
      location_id: row.location_id || "",
      is_active: row.is_active !== false,
    })
    setError("")
    setShowForm(true)
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      ...(isAdmin && form.location_id ? { location_id: form.location_id } : {}),
    }
    if (form.pin) body.pin = form.pin.trim()
    if (form.password) body.password = form.password
    if (editingId) {
      body.is_active = form.is_active
      if (isAdmin) body.role = form.role
    } else {
      body.email = form.email.trim()
      body.role = form.role
    }
    try {
      const saved = await saveStaff.mutateAsync({ id: editingId, body })
      toast(editingId ? "Staff updated" : "Staff member added")
      setShowForm(false)
      if (!editingId) setCreated(saved)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">People</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Staff</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cashiers sign in on the POS with their PIN. Managers can also use this dashboard.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add staff
        </Button>
      </div>

      {created ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <p className="font-semibold">{created.name} can now sign in.</p>
          <p className="mt-1">
            Email {created.email} · PIN {created.pin}
            {created.password ? ` · Password ${created.password}` : ""}
          </p>
          <p className="mt-1 text-emerald-700">Share these once; the password is not shown again.</p>
          <button type="button" className="mt-2 text-xs underline" onClick={() => setCreated(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {staffQuery.isPending ? <PageLoader label="Loading staff…" /> : null}
      {staffQuery.error ? <p className="mb-4 text-sm text-rose-700">{staffQuery.error.message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-slate-900">{row.name}</p>
                <p className="truncate text-sm text-slate-600">{row.email}</p>
              </div>
              <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Off"}</Pill>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone={statusTone(row.role)}>{row.role.replace("_", " ")}</Pill>
              <Pill>{locationName(row.location_id)}</Pill>
              {row.pin ? <Pill tone="sky" label="PIN">{row.pin}</Pill> : null}
            </div>
            <div className="mt-5 flex gap-2">
              {row.role !== "store_admin" ? (
                <Button variant="icon" aria-label="Edit staff" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
              <Button variant="icon" aria-label="Sales by this staff member" onClick={() => setSalesFor(row)}>
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!staffQuery.isPending && !rows.length ? (
        <p className="mt-8 text-sm text-slate-500">No staff yet.</p>
      ) : null}

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit staff" : "New staff member"}</h2>
              <button type="button" className="text-slate-600" aria-label="Close" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
            <div className="grid gap-3">
              <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {!editingId ? (
                <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              ) : null}
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input
                label={editingId ? "New password (optional)" : "Password"}
                type="password"
                required={!editingId}
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Input
                label={editingId ? "New PIN (optional)" : "POS PIN (4–6 digits)"}
                inputMode="numeric"
                pattern="\d{4,6}"
                required={!editingId}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              />
              {!editingId || isAdmin ? (
                <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                </Select>
              ) : null}
              {isAdmin ? (
                <Select
                  label="Location"
                  value={form.location_id}
                  onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                >
                  <option value="">Default location</option>
                  {locations.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </Select>
              ) : null}
              {editingId ? (
                <Checkbox label="Active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saveStaff.isPending}>{editingId ? "Save" : "Create"}</Button>
            </div>
          </form>
      </Modal>

      {salesFor ? <StaffSalesDialog staff={salesFor} onClose={() => setSalesFor(null)} /> : null}
    </section>
  )
}

function StaffSalesDialog({ staff, onClose }) {
  const salesQuery = useStaffSalesQuery(staff.id)
  const orders = salesQuery.data?.orders || []
  const completed = orders.filter((row) => row.order_status === "completed")
  const total = completed.reduce((sum, row) => sum + Number(row.total_amount || 0), 0)

  return (
    <Modal open onClose={onClose} size="md">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Sales · {staff.name}</h2>
          <button type="button" className="text-slate-600" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {salesQuery.isPending ? <PageLoader label="Loading sales…" /> : null}
        {salesQuery.error ? <p className="text-sm text-rose-700">{salesQuery.error.message}</p> : null}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Completed sales</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{completed.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</p>
            <p className="mt-1 text-lg font-semibold text-slate-900"><Currency value={total} /></p>
          </div>
        </div>
        <ul className="divide-y divide-slate-200 text-sm">
          {orders.slice(0, 50).map((row) => (
            <li key={row.id} className="flex items-center justify-between py-2 text-slate-700">
              <span>#{row.order_number} · {new Date(row.placed_at).toLocaleString()}</span>
              <span className="flex items-center gap-2">
                <StatusBadge value={row.order_status} />
                <Currency value={row.total_amount} />
              </span>
            </li>
          ))}
        </ul>
        {!salesQuery.isPending && !orders.length ? <p className="text-sm text-slate-500">No sales yet.</p> : null}
      </div>
    </Modal>
  )
}
