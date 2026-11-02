import { StatCards } from "../../ui/PageHeader.jsx"
import { useNavigate } from "react-router-dom"
import {
  useCancelStockTransfer,
  useCompleteStockTransfer,
  useStockTransfersQuery,
} from "../../features/inventory/inventoryQuery.js"
import { useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { Plus } from "lucide-react"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { formatDateTime } from "../../ui/format.js"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

/** Every location a transfer goes to. */
const destinationIds = (row) => (row.destinations || []).map((dest) => dest.to_location_id)

export function TransfersPage() {
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const transfersQuery = useStockTransfersQuery()
  const locationsQuery = useLocationsQuery()
  const productsQuery = useProductsQuery({}, { sellable: true })
  const completeTransfer = useCompleteStockTransfer()
  const cancelTransfer = useCancelStockTransfer()

  const scope = useDashboardLocation()
  const staffName = useStaffNames()
  // A transfer belongs to both ends: the chosen location sees what it sent and what it receives.
  const rows = (transfersQuery.data || []).filter(
    (row) => !scope.locationId || row.from_location_id === scope.locationId || destinationIds(row).includes(scope.locationId)
  )
  const canManage = scope.isAdmin
  const isOpen = (row) => row.status === "on_the_way" || row.status === "pending"
  const locations = locationsQuery.data || []
  const products = productsQuery.data || []
  const productName = Object.fromEntries(products.map((row) => [row.id, row.title]))
  const locationName = Object.fromEntries(locations.map((row) => [row.id, row.name]))
  // Each destination with its products and qty, e.g. "Branch 2: Pepsi - 1L × 20, Lux × 12".
  const lines = (row) =>
    (row.destinations || []).map((dest) => ({
      to: locationName[dest.to_location_id] || "—",
      status: dest.status,
      products: dest.products.map((line) => `${productName[line.product_id] || "Product"} × ${Number(line.qty)}`),
    }))
  const totalQty = (row) => (row.destinations || []).reduce((sum, dest) => sum + dest.products.reduce((s, line) => s + Number(line.qty || 0), 0), 0)

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
          <Button onClick={() => navigate("/transfers/new")}>
            <Plus className="h-4 w-4" />
            New transfer
          </Button>
        ) : null}
      </div>

      <StatCards
        items={[
          { label: "Transfers", value: rows.length },
          { label: "Open", value: rows.filter(isOpen).length, hint: "Pending or on the way" },
          { label: "Received", value: rows.filter((row) => row.status === "received" || row.status === "completed").length },
          { label: "Cancelled", value: rows.filter((row) => row.status === "cancelled" || row.status === "rejected").length },
        ]}
      />
      <DataTable
        columns={[
          { key: "transfer_number", header: "Transfer #", sortValue: (row) => Number(row.transfer_number), render: (row) => <span className="font-semibold text-slate-900">#{row.transfer_number}</span> },
          { key: "created_at", header: "Date", sortValue: (row) => new Date(row.created_at), render: (row) => formatDateTime(row.created_at) },
          { key: "from", header: "From", sortValue: (row) => locationName[row.from_location_id], render: (row) => locationName[row.from_location_id] || "—" },
          {
            key: "to",
            header: "To · products",
            sortable: false,
            render: (row) => (
              <div className="min-w-56 space-y-1.5">
                {lines(row).map((dest, index) => (
                  <div key={index}>
                    <p className="text-sm font-medium text-slate-900">
                      {dest.to} {dest.status ? <StatusBadge value={dest.status} /> : null}
                    </p>
                    <p className="text-xs text-slate-500">{dest.products.join(", ")}</p>
                  </div>
                ))}
              </div>
            ),
          },
          { key: "qty", header: "Qty", align: "right", sortValue: (row) => totalQty(row), render: (row) => totalQty(row) },
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
        search={{ placeholder: "Search product, location or note…", text: (row) => `${lines(row).map((dest) => `${dest.to} ${dest.products.join(" ")}`).join(" ")} ${row.note || ""} #${row.transfer_number}` }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "on_the_way", label: "On the way" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }] },
          ...(scope.locationId
            ? [{ key: "direction", label: "Direction", options: [{ value: "out", label: "Sent" }, { value: "in", label: "Received" }], match: (row, value) => (value === "out" ? row.from_location_id === scope.locationId : destinationIds(row).includes(scope.locationId)) }]
            : []),
        ]}
        dateRange={{ value: (row) => row.created_at }}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="No transfers yet."
      />
    </section>
  )
}
