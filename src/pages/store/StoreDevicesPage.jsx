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
import { PageLoader } from "../../ui/Spinner.jsx"
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
  const [locationFilter, setLocationFilter] = useState("")
  const filters = useMemo(
    () => (isAdmin && locationFilter ? { location_id: locationFilter } : {}),
    [isAdmin, locationFilter]
  )
  const devicesQuery = usePosDevicesQuery(filters)
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Devices</h1>
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

      {isAdmin && locations.length ? (
        <Select
          label="Filter by location"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="">All locations</option>
          {locations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
      ) : null}

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

      {devicesQuery.isPending ? <PageLoader label="Loading devices…" /> : null}
      {devicesQuery.error ? (
        <p className="text-sm text-rose-700">{devicesQuery.error.message}</p>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-[24px] border border-slate-200 bg-white px-5 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <Pill tone={statusTone(row.is_active ? "active" : "inactive")}>
                    {row.is_active ? "active" : "inactive"}
                  </Pill>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{row.device_uid}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {locationName[row.location_id] || location?.name || "Location"} ·{" "}
                  {row.platform || "—"}
                  {row.app_version ? ` · v${row.app_version}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Last seen{" "}
                  {row.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : "—"}
                </p>
              </div>
              {isAdmin ? (
                <Button variant="icon" aria-label="Edit device" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {!devicesQuery.isPending && !rows.length ? (
          <p className="rounded-[24px] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
            No devices registered.
          </p>
        ) : null}
      </div>
    </section>
  )
}
