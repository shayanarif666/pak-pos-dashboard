import { useMemo, useState } from "react"
import { Pencil, Plus, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useSaveLocation,
  useStoreLocationsQuery,
} from "../../features/people/peopleQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, statusTone } from "../../ui/Pill.jsx"

const emptyForm = {
  name: "",
  address_line: "",
  city: "",
  postal_code: "",
  phone: "",
  is_active: true,
  is_default: false,
  manager_name: "",
  manager_email: "",
  manager_password: "",
  manager_pin: "",
  manager_phone: "",
  manager_is_active: true,
}

export function LocationsPage() {
  const { user, location: assignedLocation, store } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === "store_admin"
  const locationsQuery = useStoreLocationsQuery()
  const saveLocation = useSaveLocation()
  const allRows = locationsQuery.data || []
  const rows = useMemo(() => {
    if (isAdmin) return allRows
    return allRows.filter((row) => row.id === assignedLocation?.id)
  }, [allRows, assignedLocation?.id, isAdmin])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      ...emptyForm,
      name: row.name || "",
      address_line: row.address_line || "",
      city: row.city || "",
      postal_code: row.postal_code || "",
      phone: row.phone || "",
      is_active: row.is_active !== false,
      is_default: Boolean(row.is_default),
      manager_name: row.manager?.name || "",
      manager_email: row.manager?.email || "",
      manager_password: "",
      manager_pin: row.manager?.pin || "",
      manager_phone: row.manager?.phone || "",
      manager_is_active: row.manager ? row.manager.is_active !== false : true,
    })
    setError("")
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError("")
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError("")
    try {
      const body = {
        name: form.name.trim(),
        address_line: form.address_line.trim(),
        city: form.city.trim(),
        postal_code: form.postal_code.trim() || null,
        phone: form.phone.trim() || null,
        is_active: form.is_active,
        is_default: form.is_default,
      }
      if (isAdmin) {
        body.manager_name = form.manager_name.trim()
        body.manager_email = form.manager_email.trim()
        body.manager_phone = form.manager_phone.trim() || null
        body.manager_pin = form.manager_pin.trim()
        body.manager_is_active = form.manager_is_active
        if (!editingId || form.manager_password) {
          body.manager_password = form.manager_password
        }
      }
      await saveLocation.mutateAsync({ id: editingId || undefined, body })
      toast(editingId ? "Location updated" : "Location created with manager")
      closeForm()
    } catch (err) {
      setError(err.message)
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">People</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Locations</h1>
          <p className="mt-1 text-sm text-slate-500">
            {store?.name ? `${store.name} · ` : ""}
            {isAdmin
              ? "Create branches with a manager account. Set a default location for stock and POS."
              : "View and update your assigned location."}
          </p>
        </div>
        {isAdmin && !showForm ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add location
          </Button>
        ) : null}
      </div>

      <Modal open={showForm} onClose={closeForm} size="xl">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 max-h-[85vh] overflow-y-auto shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? "Edit location" : "New location"}
            </h2>
            <Button variant="icon" type="button" onClick={closeForm} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="City"
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              className="sm:col-span-2"
              label="Address"
              required
              value={form.address_line}
              onChange={(e) => setForm({ ...form, address_line: e.target.value })}
            />
            <Input
              label="Postal code"
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <Checkbox
                label="Active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
            </div>
            {isAdmin ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
                <Checkbox
                  label="Default location"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                />
              </div>
            ) : null}
          </div>

          {isAdmin ? (
            <div className="space-y-4 rounded-2xl border border-brand-300 bg-brand-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                  Location manager
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {editingId
                    ? "Update this branch manager. Leave password blank to keep the current one."
                    : "Required. This account can manage stock and staff at this location only."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Manager name"
                  required
                  value={form.manager_name}
                  onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                />
                <Input
                  label="Manager email"
                  type="email"
                  required
                  value={form.manager_email}
                  onChange={(e) => setForm({ ...form, manager_email: e.target.value })}
                />
                <Input
                  label={editingId ? "New password (optional)" : "Manager password"}
                  type="password"
                  required={!editingId}
                  minLength={6}
                  value={form.manager_password}
                  onChange={(e) => setForm({ ...form, manager_password: e.target.value })}
                />
                <Input
                  label="Manager PIN (4–6 digits)"
                  required
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  value={form.manager_pin}
                  onChange={(e) => setForm({ ...form, manager_pin: e.target.value })}
                />
                <Input
                  label="Manager phone"
                  value={form.manager_phone}
                  onChange={(e) => setForm({ ...form, manager_phone: e.target.value })}
                />
                {editingId ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:self-end">
                    <Checkbox
                      label="Manager active"
                      checked={form.manager_is_active}
                      onChange={(e) =>
                        setForm({ ...form, manager_is_active: e.target.checked })
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={saveLocation.isPending}>
            {saveLocation.isPending ? "Saving…" : editingId ? "Save changes" : "Create location"}
          </Button>
        </form>
      </Modal>

      {locationsQuery.isPending ? <PageLoader label="Loading locations…" /> : null}
      {locationsQuery.error ? (
        <p className="text-sm text-rose-700">{locationsQuery.error.message}</p>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-[24px] border border-slate-200 bg-white px-5 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{row.name}</p>
                  {row.is_default ? <Pill tone="sky">Default</Pill> : null}
                  <Pill tone={statusTone(row.is_active ? "active" : "inactive")}>
                    {row.is_active ? "active" : "inactive"}
                  </Pill>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  #{row.location_number} · {row.city}
                </p>
                <p className="mt-1 text-sm text-slate-500">{row.address_line}</p>
                {row.phone ? <p className="mt-1 text-xs text-slate-500">{row.phone}</p> : null}

                {row.manager ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Manager
                      </p>
                      <Pill tone={row.manager.is_active !== false ? "emerald" : "rose"}>
                        {row.manager.is_active !== false ? "active" : "inactive"}
                      </Pill>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{row.manager.name}</p>
                    <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                      {row.manager.email ? <p>{row.manager.email}</p> : null}
                      {row.manager.phone ? <p>{row.manager.phone}</p> : null}
                      {row.manager.pin ? <p>PIN {row.manager.pin}</p> : null}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-amber-700">No manager assigned</p>
                )}
              </div>
              <Button variant="icon" aria-label="Edit location" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {!locationsQuery.isPending && !rows.length ? (
          <p className="rounded-[24px] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
            No locations yet.
          </p>
        ) : null}
      </div>
    </section>
  )
}
