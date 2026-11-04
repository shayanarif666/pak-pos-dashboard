import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { useAuth } from "../../auth/AuthContext.jsx"
import { Link } from "react-router-dom"
import { useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useStockMovementsQuery } from "../../features/inventory/inventoryQuery.js"
import { Plus } from "lucide-react"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { formatDateTime } from "../../ui/format.js"
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
  const isAdmin = auth.user.role === "store_admin"
  const scope = useDashboardLocation()
  const staffName = useStaffNames()
  const productsQuery = useProductsQuery()
  const movementsQuery = useStockMovementsQuery(scope.locationId ? { locationId: scope.locationId } : {})
  const products = productsQuery.data || []
  const rows = movementsQuery.data || []
  const loading = movementsQuery.isPending
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
          { key: "created_at", header: "Date", sortValue: (row) => new Date(row.created_at), render: (row) => formatDateTime(row.created_at) },
          { key: "product", header: "Product", sortValue: (row) => productLabel(row), render: (row) => <span className="font-medium text-slate-900">{productLabel(row) || "—"}</span> },
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
          { key: "staff", header: "By", sortValue: (row) => row.staff?.name || staffName(row.staff_id), render: (row) => (row.staff_id ? row.staff?.name || staffName(row.staff_id) : "System") },
          { key: "reason_note", header: "Note", sortable: false, className: "max-w-56 truncate", render: (row) => row.reason_note || "—" },
        ]}
        rows={rows}
        loading={loading}
        error={movementsQuery.error}
        search={{ placeholder: "Search product or note…", text: (row) => `${productLabel(row)} ${row.reason_note || ""}` }}
        filters={[
          { key: "movement_type", label: "Type", options: ["stock_in", "stock_out", "adjustment", "sale", "refund", "transfer_in", "transfer_out", "custom_sale"].map((value) => ({ value, label: label(value) })) },
          { key: "reason", label: "Reason", options: [...REASONS, "sale", "refund", "transfer"].map((value) => ({ value, label: label(value) })) },
          { key: "product", label: "Product", options: products.map((row) => ({ value: row.id, label: row.title })), match: (row, value) => row.product?.id === value },
        ]}
        dateRange={{ value: (row) => row.created_at }}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="No movements yet."
      />
    </section>
  )
}
