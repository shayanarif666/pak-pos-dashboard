import { useState } from "react"
import {
  useCancelStockTransfer,
  useCompleteStockTransfer,
  useCreateStockTransfer,
  useStockTransfersQuery,
} from "../../features/inventory/inventoryQuery.js"
import { useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
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
import { StatusBadge } from "../../ui/Pill.jsx"

export function TransfersPage() {
  const { toast, confirmToast } = useToast()
  const transfersQuery = useStockTransfersQuery()
  const locationsQuery = useLocationsQuery()
  const productsQuery = useProductsQuery()
  const createTransfer = useCreateStockTransfer()
  const completeTransfer = useCompleteStockTransfer()
  const cancelTransfer = useCancelStockTransfer()
  const [form, setForm] = useState({
    product_id: "",
    from_location_id: "",
    to_location_id: "",
    qty: "",
    note: "",
  })
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const closeForm = () => setShowForm(false)

  const scope = useDashboardLocation()
  const staffName = useStaffNames()
  // A transfer belongs to both ends: the chosen location sees what it sent and what it receives.
  const rows = (transfersQuery.data || []).filter(
    (row) => !scope.locationId || row.from_location_id === scope.locationId || row.to_location_id === scope.locationId
  )
  const canManage = scope.isAdmin
  const isOpen = (row) => row.status === "on_the_way" || row.status === "pending"
  const locations = locationsQuery.data || []
  const products = productsQuery.data || []
  const productName = Object.fromEntries(products.map((row) => [row.id, row.title]))
  const locationName = Object.fromEntries(locations.map((row) => [row.id, row.name]))

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      await createTransfer.mutateAsync({
        product_id: form.product_id,
        from_location_id: form.from_location_id,
        to_location_id: form.to_location_id,
        qty: Number(form.qty),
        note: form.note || null,
      })
      toast("Transfer created")
      setShowForm(false)
      setForm({ product_id: "", from_location_id: "", to_location_id: "", qty: "", note: "" })
    } catch (err) {
      setError(err.message)
    }
  }

  async function complete(row) {
    try {
      await completeTransfer.mutateAsync(row.id)
      toast("Transfer completed")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function cancel(row) {
    const ok = await confirmToast({
      title: "Cancel transfer?",
      message: "Only a pending transfer can be cancelled.",
      confirmLabel: "Cancel transfer",
    })
    if (!ok) return
    try {
      await cancelTransfer.mutateAsync(row.id)
      toast("Transfer cancelled")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Stock Transfers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Stock sent from one location to another. It stays on the way until the receiving location completes it.
        </p>
      </div>
        {canManage ? (
          <Button onClick={() => { setError(""); setShowForm(true) }}>
            <Plus className="h-4 w-4" />
            New transfer
          </Button>
        ) : null}
      </div>

      <Modal open={showForm} onClose={closeForm} size="lg">
      <ModalCard as="form" title="New stock transfer" onClose={closeForm} onSubmit={save}>
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
        <Input
          label="Quantity"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={form.qty}
          onChange={(e) => setForm({ ...form, qty: e.target.value })}
        />
        <Select
          label="From location"
          required
          value={form.from_location_id}
          onChange={(e) => setForm({ ...form, from_location_id: e.target.value })}
        >
          <option value="">Select source</option>
          {locations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <Select
          label="To location"
          required
          value={form.to_location_id}
          onChange={(e) => setForm({ ...form, to_location_id: e.target.value })}
        >
          <option value="">Select destination</option>
          {locations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <Input
          className="md:col-span-2"
          label="Note"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        {error ? <p className="md:col-span-2 text-sm text-rose-700">{error}</p> : null}
        <div>
          <Button type="submit" disabled={createTransfer.isPending}>
            Create transfer
          </Button>
        </div>
      </div>
      </ModalCard>
      </Modal>

      <DataTable
        columns={[
          { key: "transfer_number", header: "Transfer #", sortValue: (row) => Number(row.transfer_number), render: (row) => <span className="font-semibold text-slate-900">#{row.transfer_number}</span> },
          { key: "created_at", header: "Date", sortValue: (row) => new Date(row.created_at), render: (row) => formatDateTime(row.created_at) },
          { key: "product", header: "Product", sortValue: (row) => productName[row.product_id], render: (row) => productName[row.product_id] || "—" },
          { key: "from", header: "From", sortValue: (row) => locationName[row.from_location_id], render: (row) => locationName[row.from_location_id] || "—" },
          { key: "to", header: "To", sortValue: (row) => locationName[row.to_location_id], render: (row) => locationName[row.to_location_id] || "—" },
          { key: "qty", header: "Qty", align: "right", sortValue: (row) => Number(row.qty), render: (row) => Number(row.qty) },
          { key: "by", header: "By", sortValue: (row) => staffName(row.created_by), render: (row) => staffName(row.created_by) },
          { key: "note", header: "Note", sortable: false, className: "max-w-48 truncate", render: (row) => row.note || "—" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          ...(canManage
            ? [{
                key: "actions",
                header: "",
                sortable: false,
                render: (row) =>
                  isOpen(row) ? (
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => complete(row)}>Complete</Button>
                      <Button variant="danger" onClick={() => cancel(row)}>Cancel</Button>
                    </div>
                  ) : null,
              }]
            : []),
        ]}
        rows={rows}
        loading={transfersQuery.isPending}
        error={transfersQuery.error}
        search={{ placeholder: "Search product or note…", text: (row) => `${productName[row.product_id] || ""} ${row.note || ""} #${row.transfer_number}` }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "on_the_way", label: "On the way" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }] },
          ...(scope.locationId
            ? [{ key: "direction", label: "Direction", options: [{ value: "out", label: "Sent" }, { value: "in", label: "Received" }], match: (row, value) => (value === "out" ? row.from_location_id : row.to_location_id) === scope.locationId }]
            : []),
        ]}
        dateRange={{ value: (row) => row.created_at }}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="No transfers yet."
      />
    </section>
  )
}
