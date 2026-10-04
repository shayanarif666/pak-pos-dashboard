import { useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import {
  useAdminPosDevicesQuery,
  useCreateAdminPosDevice,
  useStoreQuery,
  useStoresQuery,
} from "../../features/admin/adminQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, statusTone } from "../../ui/Pill.jsx"

function newDeviceUid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function DevicesPage() {
  const { toast } = useToast()
  const [storeId, setStoreId] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    store_id: "",
    location_id: "",
    device_uid: "",
    name: "",
    platform: "web",
    app_version: "",
  })

  const filters = useMemo(
    () => ({
      store_id: storeId || undefined,
      is_active: activeFilter === "" ? undefined : activeFilter,
    }),
    [storeId, activeFilter]
  )

  const storesQuery = useStoresQuery()
  const formStoreQuery = useStoreQuery(form.store_id, { enabled: Boolean(form.store_id) })
  const devicesQuery = useAdminPosDevicesQuery(filters)
  const createDevice = useCreateAdminPosDevice()
  const stores = storesQuery.data || []
  const rows = devicesQuery.data || []
  const storeLocations = formStoreQuery.data?.locations || []

  function openCreate() {
    setForm({
      store_id: storeId || stores[0]?.id || "",
      location_id: "",
      device_uid: newDeviceUid(),
      name: "",
      platform: "web",
      app_version: "",
    })
    setError("")
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setError("")
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError("")
    try {
      await createDevice.mutateAsync({
        store_id: form.store_id,
        location_id: form.location_id,
        device_uid: form.device_uid.trim(),
        name: form.name.trim(),
        platform: form.platform.trim() || null,
        app_version: form.app_version.trim() || null,
      })
      toast("Device registered")
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Super Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Devices</h1>
          <p className="mt-1 text-sm text-slate-500">All POS devices across every store.</p>
        </div>
        {!showForm ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Register device
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Store" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">All stores</option>
          {stores.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <Select
          label="Status"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      <Modal open={showForm} onClose={closeForm} size="lg">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 max-h-[85vh] overflow-y-auto shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Register device</h2>
            <Button variant="icon" type="button" onClick={closeForm} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Store"
              required
              value={form.store_id}
              onChange={(e) =>
                setForm({ ...form, store_id: e.target.value, location_id: "" })
              }
            >
              <option value="">Select store</option>
              {stores.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
            <Select
              label="Location"
              required
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
            >
              <option value="">Select location</option>
              {storeLocations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
            <Input
              label="Device UID"
              required
              value={form.device_uid}
              onChange={(e) => setForm({ ...form, device_uid: e.target.value })}
            />
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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
          </div>
          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={createDevice.isPending}>
            {createDevice.isPending ? "Saving…" : "Register device"}
          </Button>
        </form>
      </Modal>

      {devicesQuery.isPending || storesQuery.isPending ? (
        <PageLoader label="Loading devices…" />
      ) : null}
      {devicesQuery.error ? (
        <p className="text-sm text-rose-700">{devicesQuery.error.message}</p>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-[24px] border border-slate-200 bg-white px-5 py-4"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{row.name}</p>
                <Pill tone={statusTone(row.is_active ? "active" : "inactive")}>
                  {row.is_active ? "active" : "inactive"}
                </Pill>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">{row.device_uid}</p>
              <p className="mt-1 text-sm text-slate-600">
                {row.store_name || "Store"} · {row.location_name || "Location"} ·{" "}
                {row.platform || "—"}
                {row.app_version ? ` · v${row.app_version}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Last seen{" "}
                {row.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : "—"}
              </p>
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
