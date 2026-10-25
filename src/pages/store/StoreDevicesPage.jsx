import { useMemo, useState } from "react"
import { Pencil, Plus, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  usePosDevicesQuery,
  useRegisterPosDevice,
  useStoreLocationsQuery,
  useUpdatePosDevice,
} from "../../features/people/peopleQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { formatDateTime } from "../../ui/format.js"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, statusTone } from "../../ui/Pill.jsx"

function newDeviceUid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const emptyForm = {
  device_uid: "",
  name: "",
  location_id: "",
  platform: "web",
  app_version: "",
}

export function StoreDevicesPage() {
  const { user, location, store } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === "store_admin"
  const isManager = user?.role === "manager"
  const scope = useDashboardLocation()
  const devicesQuery = usePosDevicesQuery(scope.params)
  const locationsQuery = useStoreLocationsQuery({ enabled: isAdmin || isManager })
  const registerDevice = useRegisterPosDevice()
  const updateDevice = useUpdatePosDevice()
  const rows = devicesQuery.data || []
  const locations = useMemo(() => {
    const all = locationsQuery.data || []
    if (isManager && location?.id) {
      return all.filter((row) => row.id === location.id)
    }
    return all
  }, [locationsQuery.data, isManager, location?.id])
  const locationName = useMemo(
    () => Object.fromEntries(locations.map((row) => [row.id, row.name])),
    [locations]
  )

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")

  function openCreate() {
    setEditing(null)
    setForm({
      ...emptyForm,
      device_uid: newDeviceUid(),
      location_id: isAdmin
        ? locations.find((row) => row.is_default)?.id || locations[0]?.id || ""
        : location?.id || locations[0]?.id || "",
    })
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    setEditing(row)
    setForm({
      device_uid: row.device_uid || "",
      name: row.name || "",
      location_id: row.location_id || "",
      platform: row.platform || "",
      app_version: row.app_version || "",
      is_active: row.is_active !== false,
    })
    setError("")
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
    setError("")
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError("")
    try {
      if (editing) {
        if (!isAdmin) throw new Error("Only store admin can update devices")
        await updateDevice.mutateAsync({
          id: editing.id,
          body: {
            name: form.name.trim(),
            location_id: form.location_id,
            is_active: Boolean(form.is_active),
          },
        })
        toast("Device updated")
      } else {
        await registerDevice.mutateAsync({
          device_uid: form.device_uid.trim(),
          name: form.name.trim(),
          location_id: form.location_id,
          platform: form.platform.trim() || null,
          app_version: form.app_version.trim() || null,
        })
        toast("Device registered")
      }
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Staff</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Devices Registered</h1>
          <p className="mt-1 text-sm text-slate-500">
            {store?.name ? `${store.name} · ` : ""}
            {isManager
              ? `POS devices for ${location?.name || "your location"} only.`
              : "Register and manage POS devices for this store."}
          </p>
        </div>
        {!showForm ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Register device
          </Button>
        ) : null}
      </div>


      <Modal open={showForm} onClose={closeForm} size="lg">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 max-h-[85vh] overflow-y-auto shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {editing ? "Edit device" : "Register device"}
            </h2>
            <Button variant="icon" type="button" onClick={closeForm} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Device UID"
              required
              disabled={Boolean(editing)}
              value={form.device_uid}
              onChange={(e) => setForm({ ...form, device_uid: e.target.value })}
            />
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Select
              label="Location"
              required
              value={form.location_id}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
            >
              <option value="">Select location</option>
              {locations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
            {!editing ? (
              <>
                <Input
                  label="Platform"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                />
                <Input
                  label="App version"
                  value={form.app_version}
                  onChange={(e) => setForm({ ...form, app_version: e.target.value })}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:col-span-2">
                <Checkbox
                  label="Active"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
              </div>
            )}
          </div>
          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={registerDevice.isPending || updateDevice.isPending}
          >
            {registerDevice.isPending || updateDevice.isPending
              ? "Saving…"
              : editing
                ? "Save device"
                : "Register device"}
          </Button>
        </form>
      </Modal>

      <DataTable
        columns={[
          {
            key: "name",
            header: "Device",
            render: (row) => (
              <div className="min-w-40">
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500">#{row.device_number} · <span className="font-mono">{row.device_uid}</span></p>
              </div>
            ),
          },
          { key: "location", header: "Location", sortValue: (row) => locationName[row.location_id], render: (row) => locationName[row.location_id] || (row.location_id ? "—" : "Not assigned") },
          { key: "platform", header: "Platform", render: (row) => row.platform || "—" },
          { key: "app_version", header: "App version", render: (row) => (row.app_version ? `v${row.app_version}` : "—") },
          { key: "created_at", header: "Registered", sortValue: (row) => new Date(row.created_at), render: (row) => formatDateTime(row.created_at) },
          { key: "last_seen_at", header: "Last seen", sortValue: (row) => (row.last_seen_at ? new Date(row.last_seen_at) : null), render: (row) => formatDateTime(row.last_seen_at) },
          { key: "is_active", header: "Status", sortValue: (row) => (row.is_active ? 1 : 0), render: (row) => <Pill tone={statusTone(row.is_active ? "active" : "inactive")}>{row.is_active ? "active" : "inactive"}</Pill> },
          ...(isAdmin
            ? [{
                key: "actions",
                header: "",
                sortable: false,
                render: (row) => (
                  <div className="flex justify-end">
                    <Button variant="icon" aria-label="Edit device" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                  </div>
                ),
              }]
            : []),
        ]}
        rows={rows}
        loading={devicesQuery.isPending}
        error={devicesQuery.error}
        search={{ placeholder: "Search device name or id…", text: (row) => `${row.name} ${row.device_uid} ${row.device_number}` }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }], match: (row, value) => (row.is_active ? "active" : "inactive") === value },
        ]}
        dateRange={{ label: "Registered", value: (row) => row.created_at }}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="No devices registered."
      />
    </section>
  )
}
