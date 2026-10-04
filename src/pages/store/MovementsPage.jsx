import { useState } from "react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { resolveDashboardLocation } from "../../features/catalog/dashboardLocation.js"
import { useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import {
  useCreateStockMovement,
  useStockMovementsQuery,
} from "../../features/inventory/inventoryQuery.js"
import { Plus } from "lucide-react"
import { Button } from "../../ui/Button.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

const TYPES = ["stock_in", "stock_out", "adjustment"]
const REASONS = [
  "purchase",
  "opening_balance",
  "return_to_supplier",
  "customer_return",
  "waste",
  "damage",
  "expiry",
  "theft",
  "count",
  "sync",
  "other",
]

function typeTone(type) {
  if (type === "stock_in" || type === "refund" || type === "transfer_in") return "emerald"
  if (type === "stock_out" || type === "sale" || type === "transfer_out") return "rose"
  return "amber"
}

function label(value) {
  return String(value || "").replaceAll("_", " ")
}

export function MovementsPage() {
  const auth = useAuth()
  const { toast } = useToast()
  const isAdmin = auth.user.role === "store_admin"
  const tokenLocation = resolveDashboardLocation(auth)
  const [locationId, setLocationId] = useState(isAdmin ? "" : tokenLocation?.id || "")
  const [movementType, setMovementType] = useState("")
  const [filters, setFilters] = useState({ locationId: isAdmin ? "" : tokenLocation?.id || "", movement_type: "" })
  const [form, setForm] = useState({
    product_id: "",
    movement_type: "stock_in",
    qty: "",
    reason: "purchase",
    reason_note: "",
    location_id: tokenLocation?.id || "",
  })

  const [showForm, setShowForm] = useState(false)
  const closeForm = () => setShowForm(false)
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const productsQuery = useProductsQuery()
  const movementsQuery = useStockMovementsQuery({
    locationId: filters.locationId || undefined,
    movement_type: filters.movement_type || undefined,
  })
  const createMovement = useCreateStockMovement()

  const locations = locationsQuery.data || []
  const products = productsQuery.data || []
  const rows = movementsQuery.data || []
  const productName = Object.fromEntries(products.map((row) => [row.id, row.title]))
  const loading = movementsQuery.isPending
  const error = movementsQuery.error?.message || ""

  async function save(event) {
    event.preventDefault()
    const qty = Number(form.qty)
    const signed =
      form.movement_type === "stock_out" ? -Math.abs(qty) : Math.abs(qty)
    try {
      await createMovement.mutateAsync({
        product_id: form.product_id,
        location_id: isAdmin ? form.location_id || undefined : undefined,
        movement_type: form.movement_type,
        reason: form.reason,
        qty: form.movement_type === "adjustment" ? qty : signed,
        reason_note: form.reason_note || null,
      })
      toast("Movement recorded")
      setShowForm(false)
      setForm((current) => ({ ...current, qty: "", reason_note: "" }))
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Stock Movements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record stock in, stock out, and adjustments
          {isAdmin ? ". Store admin can pick a location." : " for your login location."}
        </p>
      </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Record movement
        </Button>
      </div>

      <Modal open={showForm} onClose={closeForm} size="lg">
      <ModalCard as="form" title="Record stock movement" onClose={closeForm} onSubmit={save}>
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="Product"
          required
          value={form.product_id}
          onChange={(e) => setForm({ ...form, product_id: e.target.value })}
        >
          <option value="">Select product</option>
          {products.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </Select>
        {isAdmin ? (
          <Select
            label="Location"
            required
            value={form.location_id}
            onChange={(e) => setForm({ ...form, location_id: e.target.value })}
          >
            <option value="">Select location</option>
            {locations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input label="Location" value={tokenLocation?.name || "Login location"} disabled />
        )}
        <Select
          label="Type"
          value={form.movement_type}
          onChange={(e) => setForm({ ...form, movement_type: e.target.value })}
        >
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {label(type)}
            </option>
          ))}
        </Select>
        <Input
          label={form.movement_type === "adjustment" ? "Qty (signed)" : "Quantity"}
          type="number"
          required
          step="0.01"
          value={form.qty}
          onChange={(e) => setForm({ ...form, qty: e.target.value })}
        />
        <Select
          label="Reason"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        >
          {REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {label(reason)}
            </option>
          ))}
        </Select>
        <Input
          label="Note"
          value={form.reason_note}
          onChange={(e) => setForm({ ...form, reason_note: e.target.value })}
        />
        <div className="flex items-end">
          <Button type="submit" disabled={createMovement.isPending}>
            {createMovement.isPending ? "Saving…" : "Record movement"}
          </Button>
        </div>
      </div>
      </ModalCard>
      </Modal>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setFilters({ locationId, movement_type: movementType })
        }}
        className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        {isAdmin ? (
          <Select label="Filter location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input label="Location" value={tokenLocation?.name || "Login location"} disabled />
        )}
        <Select label="Filter type" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
          <option value="">All types</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {label(type)}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button type="submit" variant="ghost">
            Filter
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <PageLoader label="Loading movements…" /> : null}

      <div className="grid gap-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4"
          >
            <div>
              <p className="font-medium text-slate-900">{productName[row.product_id] || row.product_id}</p>
              <p className="text-xs text-slate-500">
                {row.location_name || "Location"} · {new Date(row.created_at).toLocaleString()}
              </p>
              {row.reason_note ? <p className="mt-1 text-sm text-slate-600">{row.reason_note}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={typeTone(row.movement_type)}>{label(row.movement_type)}</Pill>
              <Pill tone="zinc">{label(row.reason)}</Pill>
              <p className="text-lg font-semibold text-slate-900">
                {row.qty > 0 ? "+" : ""}
                {row.qty}
              </p>
            </div>
          </article>
        ))}
      </div>
      {!loading && !rows.length ? <p className="text-sm text-slate-500">No movements yet.</p> : null}
    </section>
  )
}
