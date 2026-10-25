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
import { DataTable } from "../../ui/DataTable.jsx"
import { formatDateTime } from "../../ui/format.js"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
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
  const scope = useDashboardLocation()
  const staffName = useStaffNames()
  const [form, setForm] = useState({
    product_id: "",
    movement_type: "stock_in",
    qty: "",
    reason: "purchase",
    reason_note: "",
    location_id: scope.locationId || tokenLocation?.id || "",
  })

  const [showForm, setShowForm] = useState(false)
  const closeForm = () => setShowForm(false)
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const productsQuery = useProductsQuery()
  const movementsQuery = useStockMovementsQuery(scope.locationId ? { locationId: scope.locationId } : {})
  const createMovement = useCreateStockMovement()

  const locations = locationsQuery.data || []
  const products = productsQuery.data || []
  const rows = movementsQuery.data || []
  const productName = Object.fromEntries(products.map((row) => [row.id, row.title]))
  const loading = movementsQuery.isPending

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

      <DataTable
        columns={[
          { key: "created_at", header: "Date", sortValue: (row) => new Date(row.created_at), render: (row) => formatDateTime(row.created_at) },
          { key: "product", header: "Product", sortValue: (row) => productName[row.product_id], render: (row) => <span className="font-medium text-slate-900">{productName[row.product_id] || "—"}</span> },
          ...(scope.isAll ? [{ key: "location_name", header: "Location", render: (row) => row.location_name || "—" }] : []),
          { key: "movement_type", header: "Type", render: (row) => <Pill tone={typeTone(row.movement_type)}>{label(row.movement_type)}</Pill> },
          { key: "reason", header: "Reason", render: (row) => <span className="capitalize">{label(row.reason)}</span> },
          {
            key: "qty",
            header: "Qty",
            align: "right",
            sortValue: (row) => Number(row.qty),
            render: (row) => (
              <span className={Number(row.qty) < 0 ? "font-semibold text-rose-700" : "font-semibold text-emerald-700"}>
                {Number(row.qty) > 0 ? "+" : ""}
                {row.qty}
              </span>
            ),
          },
          { key: "qty_after", header: "Stock after", align: "right", sortValue: (row) => Number(row.qty_after), render: (row) => row.qty_after ?? "—" },
          { key: "staff", header: "By", sortValue: (row) => staffName(row.staff_id), render: (row) => (row.staff_id ? staffName(row.staff_id) : "System") },
          { key: "reason_note", header: "Note", sortable: false, className: "max-w-56 truncate", render: (row) => row.reason_note || "—" },
        ]}
        rows={rows}
        loading={loading}
        error={movementsQuery.error}
        search={{ placeholder: "Search product or note…", text: (row) => `${productName[row.product_id] || ""} ${row.reason_note || ""}` }}
        filters={[
          { key: "movement_type", label: "Type", options: ["stock_in", "stock_out", "adjustment", "sale", "refund", "transfer_in", "transfer_out", "custom_sale"].map((value) => ({ value, label: label(value) })) },
          { key: "reason", label: "Reason", options: [...REASONS, "sale", "refund", "transfer"].map((value) => ({ value, label: label(value) })) },
          { key: "product", label: "Product", options: products.map((row) => ({ value: row.id, label: row.title })), match: (row, value) => row.product_id === value },
        ]}
        dateRange={{ value: (row) => row.created_at }}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="No movements yet."
      />
    </section>
  )
}
