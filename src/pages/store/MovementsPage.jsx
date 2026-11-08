import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { useAuth } from "../../auth/AuthContext.jsx"
import { Link } from "react-router-dom"
import { useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useStockEdit, useStockMovementsQuery } from "../../features/inventory/inventoryQuery.js"
import { MovementEditModal, movementEditable } from "../../features/inventory/StockEditModals.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { useState } from "react"
import { Eye, Pencil, Plus, Trash2 } from "lucide-react"
import { MovementViewModal, movementTone } from "../../features/inventory/MovementViewModal.jsx"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { formatDate, formatTime } from "../../ui/format.js"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
import { Pill } from "../../ui/Pill.jsx"

// Reasons per type (opening_balance is written when a product is created).
const REASONS_BY_TYPE = {
  stock_in: ["purchase", "customer_return", "other"],
  stock_out: ["damage", "expiry", "waste", "theft", "return_to_supplier", "other"],
  adjustment: ["count", "other"],
}
const REASONS = [...new Set([...Object.values(REASONS_BY_TYPE).flat(), "opening_balance", "sync"])]

/** "Pepsi · 1L" for a movement row. */
function productLabel(row) {
  const title = row.product?.title || ""
  return row.variant?.name ? `${title} · ${row.variant.name}` : title
}

function label(value) {
  return String(value || "").replaceAll("_", " ")
}

export function MovementsPage() {
  const auth = useAuth()
  const isAdmin = auth.user.role === "store_admin"
  const scope = useDashboardLocation()
  const staffName = useStaffNames()
  const productsQuery = useProductsQuery()
  const movementsQuery = useStockMovementsQuery(scope.locationId ? { locationId: scope.locationId } : {})
  const products = productsQuery.data || []
  const rows = movementsQuery.data || []
  const loading = movementsQuery.isPending
  const { toast, confirmToast } = useToast()
  const { deleteMovement } = useStockEdit()
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  // Soft delete: the movement leaves the list and its qty is taken back off the stock.
  async function remove(row) {
    const qty = Number(row.qty)
    const ok = await confirmToast({
      title: "Delete movement?",
      message: `${productLabel(row)} at ${row.location_name || "this location"}: the ${qty > 0 ? "+" : ""}${qty} is taken back, so the stock goes ${qty > 0 ? "down" : "up"} by ${Math.abs(qty)}.`,
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await deleteMovement.mutateAsync(row.id)
      toast("Movement deleted — stock corrected")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        section="Inventory"
        title="Stock Movements"
        description={<>
          Record stock in, stock out, and adjustments
          {isAdmin ? " at one, several or all locations." : " for your login location."}
        </>}
        actions={<>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/movements/new">
              <Button>
                <Plus className="h-4 w-4" />
                Record movement
              </Button>
            </Link>
          </div>
        </>}
      />

      <StatCards
        items={[
          { label: "Movements", value: rows.length },
          { label: "Stock in", value: rows.filter((row) => Number(row.qty) > 0).length },
          { label: "Stock out", value: rows.filter((row) => Number(row.qty) < 0).length },
          { label: "Last 24 hours", value: rows.filter((row) => new Date(row.created_at) > new Date(Date.now() - 86400000)).length },
        ]}
      />
      <DataTable
        title="Stock Movements"
        columns={[
          { key: "movement_number", header: "Movement #", sortValue: (row) => Number(row.movement_number), render: (row) => <span className="font-semibold text-slate-900">#{row.movement_number ?? "—"}</span> },
          {
            key: "product",
            header: "Product",
            sortValue: (row) => productLabel(row),
            // The product, and under it the variant with the product ("1L Pepsi"); no variant: the product only.
            render: (row) => (
              <div className="min-w-36">
                <p className="font-semibold text-slate-900">{row.product?.title || "—"}</p>
                {row.variant?.name ? <p className="text-xs text-slate-500">{row.variant.name} {row.product?.title}</p> : null}
              </div>
            ),
          },
          { key: "created_at", header: "Date", sortValue: (row) => new Date(row.created_at), render: (row) => (
              <div className="whitespace-nowrap">
                <p className="text-slate-900">{formatDate(row.created_at)}</p>
                <p className="text-xs text-slate-500">{formatTime(row.created_at)}</p>
              </div>
            ),
          },
          { key: "movement_type", header: "Status", render: (row) => <Pill tone={movementTone(row.movement_type)}>{label(row.movement_type)}</Pill> },
          { key: "reason", header: "Reason", render: (row) => <span className="capitalize">{label(row.reason)}</span> },
          {
            key: "actions",
            header: "",
            sortable: false,
            // Every row can be viewed; sales, refunds and transfers change with their order /
            // transfer, so they have no edit / delete.
            render: (row) => {
              const editable = movementEditable(row)
              return (
                <div className="flex justify-end gap-1">
                  <Button variant="icon" aria-label="View movement" title="View" onClick={() => setViewing(row)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="icon" aria-label="Edit movement" title={editable ? "Edit" : "Sales, refunds and transfers cannot be edited"} disabled={!editable} onClick={() => setEditing(row)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="icon" aria-label="Delete movement" title={editable ? "Delete" : "Sales, refunds and transfers cannot be deleted"} disabled={!editable} onClick={() => remove(row)}><Trash2 className={`h-4 w-4 ${editable ? "text-rose-600" : ""}`} /></Button>
                </div>
              )
            },
          },
        ]}
        rows={rows}
        loading={loading}
        error={movementsQuery.error}
        search={{ placeholder: "Search product or note…", text: (row) => `${productLabel(row)} ${row.reason_note || ""}` }}
        filters={[
          { key: "movement_type", label: "Status", options: ["stock_in", "stock_out", "adjustment", "sale", "refund", "transfer_in", "transfer_out", "custom_sale"].map((value) => ({ value, label: label(value) })) },
          { key: "reason", label: "Reason", options: [...REASONS, "sale", "refund", "transfer"].map((value) => ({ value, label: label(value) })) },
          { key: "product", label: "Product", options: products.map((row) => ({ value: row.id, label: row.title })), match: (row, value) => row.product?.id === value },
        ]}
        dateRange={{ value: (row) => row.created_at }}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="No movements yet."
      />
      <MovementEditModal movement={editing} onClose={() => setEditing(null)} productLabel={productLabel} />
      <MovementViewModal movement={viewing} onClose={() => setViewing(null)} staffName={staffName} />
    </section>
  )
}
