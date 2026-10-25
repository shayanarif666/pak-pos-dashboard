import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useExpiryQuery } from "../../features/catalog/catalogQuery.jsx"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { formatDate } from "../../ui/format.js"

const STATUSES = [
  ["expired", "Expired"],
  ["critical", "Critical"],
  ["warning", "Warning"],
  ["ok", "OK"],
]

function expiryTone(status) {
  if (status === "expired") return "rose"
  if (status === "critical") return "amber"
  if (status === "warning") return "violet"
  return "emerald"
}

function daysLeft(date) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${String(date).slice(0, 10)}T00:00:00`) - today) / 86400000)
}

/** Product Expiry: stock with an expiry date at the chosen location(s), soonest first. */
export function ExpiryPage() {
  const navigate = useNavigate()
  const { locationId, isAll, label } = useDashboardLocation()
  const locationName = useLocationName()
  const expiryQuery = useExpiryQuery()
  // One row per product and location; keep the chosen location's.
  const rows = useMemo(
    () => (expiryQuery.data || []).filter((row) => !locationId || row.location_id === locationId),
    [expiryQuery.data, locationId]
  )
  const counts = useMemo(
    () => Object.fromEntries(STATUSES.map(([key]) => [key, rows.filter((row) => row.expiry_status === key).length])),
    [rows]
  )

  const columns = [
    {
      key: "title",
      header: "Product",
      render: (row) => (
        <div className="min-w-44">
          <p className="font-semibold text-slate-900">{row.title}</p>
          <p className="text-xs text-slate-500">#{row.product_number} · {row.sku}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", sortValue: (row) => row.category?.name, render: (row) => row.category?.name || "—" },
    ...(isAll ? [{ key: "location", header: "Location", sortValue: (row) => locationName(row.location_id), render: (row) => locationName(row.location_id) }] : []),
    { key: "qty", header: "Qty", align: "right", sortValue: (row) => Number(row.stocks?.[0]?.qty || 0), render: (row) => row.stocks?.[0]?.qty ?? "—" },
    { key: "expiry_date", header: "Expiry date", sortValue: (row) => new Date(row.expiry_date), render: (row) => formatDate(row.expiry_date) },
    {
      key: "days_left",
      header: "Days left",
      align: "right",
      sortValue: (row) => daysLeft(row.expiry_date),
      render: (row) => {
        const left = daysLeft(row.expiry_date)
        return left === null ? "—" : left < 0 ? <span className="font-semibold text-rose-700">{Math.abs(left)} days ago</span> : left
      },
    },
    { key: "expiry_status", header: "Status", render: (row) => <StatusBadge value={row.expiry_status} tone={expiryTone(row.expiry_status)} /> },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Catalog"
        title="Product Expiry"
        description={`Stock with an expiry date at ${isAll ? "every location" : label}, soonest first. Critical and warning windows come from the store's expiry settings.`}
      />
      <StatCards
        items={[
          { label: "Expired", value: counts.expired },
          { label: "Critical", value: counts.critical },
          { label: "Warning", value: counts.warning },
          { label: "OK", value: counts.ok },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => `${row.id}-${row.location_id}`}
        loading={expiryQuery.isPending}
        error={expiryQuery.error}
        search={{ placeholder: "Search product or SKU…", text: (row) => `${row.title} ${row.sku} ${row.barcode || ""} ${row.product_number}` }}
        filters={[
          { key: "expiry_status", label: "Status", options: STATUSES.map(([value, text]) => ({ value, label: text })) },
          {
            key: "category",
            label: "Category",
            options: [...new Map(rows.filter((row) => row.category).map((row) => [row.category.id, row.category.name])).entries()].map(([value, text]) => ({ value, label: text })),
            match: (row, value) => row.category?.id === value,
          },
        ]}
        dateRange={{ label: "Expiry date", value: (row) => row.expiry_date }}
        initialSort={{ key: "expiry_date", dir: "asc" }}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
        emptyText="No stock with an expiry date."
      />
    </section>
  )
}
