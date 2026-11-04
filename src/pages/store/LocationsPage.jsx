import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
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
import { DataTable } from "../../ui/DataTable.jsx"
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
    const own = assignedLocation?.id || user?.location_id
    return allRows.filter((row) => row.id === own)
  }, [allRows, assignedLocation?.id, user?.location_id, isAdmin])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [hasManager, setHasManager] = useState(false)
  const [error, setError] = useState("")
  // New location: the manager is optional, but once any manager field is filled all of them are needed.
  const managerStarted = Boolean(
    form.manager_name.trim() || form.manager_email.trim() || form.manager_password || form.manager_pin.trim()
  )

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setHasManager(false)
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
    setHasManager(Boolean(row.manager))
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
      // Edit: the existing manager's details (the password is changed under Staff).
      // New: a manager only when one was entered.
      const sendManager = isAdmin && (editingId ? hasManager : managerStarted)
      if (sendManager) {
        body.manager_name = form.manager_name.trim()
        body.manager_email = form.manager_email.trim()
        body.manager_phone = form.manager_phone.trim() || null
        body.manager_pin = form.manager_pin.trim()
        if (editingId) body.manager_is_active = form.manager_is_active
        else body.manager_password = form.manager_password
      }
      await saveLocation.mutateAsync({ id: editingId || undefined, body })
      toast(editingId ? "Location updated" : sendManager ? "Location created with manager" : "Location created")
      closeForm()
    } catch (err) {
      setError(err.message)
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        section="People"
        title="Locations"
        description={<>
          {store?.name ? `${store.name} · ` : ""}
          {isAdmin
            ? "Create branches, with or without a manager account. Set a default location for stock and POS."
            : "View and update your assigned location."}
        </>}
        actions={<>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && !showForm ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add location
              </Button>
            ) : null}
          </div>
        </>}
      />

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

          {isAdmin && editingId && !hasManager ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
              No manager at this location. Add one under Staff (role manager, this location).
            </p>
          ) : null}

          {isAdmin && (!editingId || hasManager) ? (
            <div className="space-y-4 rounded-2xl border border-brand-300 bg-brand-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                  Location manager{editingId ? "" : " (optional)"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {editingId
                    ? "Update this branch manager. The password is changed under Staff."
                    : "Leave empty to add a manager later under Staff. Once filled, the account manages stock and staff at this location only."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Manager name"
                  required={Boolean(editingId) || managerStarted}
                  value={form.manager_name}
                  onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                />
                <Input
                  label="Manager email"
                  type="email"
                  required={Boolean(editingId) || managerStarted}
                  value={form.manager_email}
                  onChange={(e) => setForm({ ...form, manager_email: e.target.value })}
                />
                {editingId ? null : (
                  <Input
                    label="Manager password"
                    type="password"
                    required={managerStarted}
                    minLength={6}
                    value={form.manager_password}
                    onChange={(e) => setForm({ ...form, manager_password: e.target.value })}
                  />
                )}
                <Input
                  label="Manager PIN (4–6 digits)"
                  required={Boolean(editingId) || managerStarted}
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

      <StatCards
        items={[
          { label: "Locations", value: allRows.length },
          { label: "Active", value: allRows.filter((row) => row.is_active !== false).length },
          { label: "Inactive", value: allRows.filter((row) => row.is_active === false).length },
          { label: "Shown", value: rows.length, hint: "With the filters below" },
        ]}
      />
      <DataTable
        title="Locations"
        columns={[
          {
            key: "name",
            header: "Location",
            render: (row) => (
              <div className="min-w-44">
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500">#{row.location_number}{row.is_default ? " · default" : ""}</p>
              </div>
            ),
          },
          { key: "city", header: "City" },
          { key: "address_line", header: "Address", sortable: false, className: "max-w-64 truncate", render: (row) => row.address_line || "—" },
          { key: "phone", header: "Phone", render: (row) => row.phone || "—" },
          {
            key: "manager",
            header: "Manager",
            sortValue: (row) => row.manager?.name,
            render: (row) =>
              row.manager ? (
                <div className="text-xs">
                  <p className="font-medium text-slate-900">{row.manager.name}</p>
                  <p className="text-slate-500">{row.manager.email}{row.manager.pin ? ` · PIN ${row.manager.pin}` : ""}</p>
                </div>
              ) : (
                <span className="text-xs text-amber-700">No manager</span>
              ),
          },
          { key: "is_active", header: "Status", sortValue: (row) => (row.is_active ? 1 : 0), render: (row) => <Pill tone={statusTone(row.is_active ? "active" : "inactive")}>{row.is_active ? "active" : "inactive"}</Pill> },
          {
            key: "actions",
            header: "",
            sortable: false,
            render: (row) => (
              <div className="flex justify-end">
                <Button variant="icon" aria-label="Edit location" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
              </div>
            ),
          },
        ]}
        rows={rows}
        loading={locationsQuery.isPending}
        error={locationsQuery.error}
        search={{ placeholder: "Search name, city or manager…", text: (row) => `${row.name} ${row.city} ${row.address_line} ${row.manager?.name || ""}` }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }], match: (row, value) => (row.is_active ? "active" : "inactive") === value },
          { key: "manager", label: "Manager", options: [{ value: "yes", label: "Has manager" }, { value: "no", label: "No manager" }], match: (row, value) => (row.manager ? "yes" : "no") === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "name", dir: "asc" }}
        emptyText="No locations yet."
      />
    </section>
  )
}
