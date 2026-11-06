import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Trash2 } from "lucide-react"
import { useStockEdit } from "../../features/inventory/inventoryQuery.js"
import { StockEntryEditModal, stockKind } from "../../features/inventory/StockEditModals.jsx"
import { Tabs, useTabParam } from "../../ui/Tabs.jsx"
import { Button } from "../../ui/Button.jsx"
import { useToast } from "../../ui/Toast.jsx"
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

const KIND_TABS = [
  ["all", "All"],
  ["pack", "Pack Items"],
  ["loose", "Loose Items"],
  ["pack_loose", "Pack + Loose Items"],
]

/** "48" for a loose item; "48 (4 packs + 8)" for a pack item. */
function qtyLabel(row) {
  const qty = Number(row.stocks?.[0]?.qty ?? 0)
  const size = Number(row.pack_size)
  if (stockKind(row) === "loose" || !(size >= 2)) return String(qty)
  const packs = Math.floor(qty / size)
  const loose = Math.round((qty - packs * size) * 10000) / 10000
  return `${qty} (${packs} ${packs === 1 ? "pack" : "packs"}${loose ? ` + ${loose}` : ""})`
}

function daysLeft(date) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${String(date).slice(0, 10)}T00:00:00`) - today) / 86400000)
}

/** Product Stock & Expiry: stock with an expiry date at the chosen location(s), soonest first. */
export function ExpiryPage() {
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const { deleteEntry } = useStockEdit()
  const [editing, setEditing] = useState(null)

  // Soft delete: the qty goes to 0 through an adjustment movement, then the entry leaves the list.
  async function remove(row) {
    const stock = row.stocks?.[0]
    if (!stock) return
    const qty = Number(stock.qty || 0)
    const ok = await confirmToast({
      title: "Delete stock?",
      message: `${row.title} at ${locationName(row.location_id)}${qty ? `: its ${qty} in stock go to 0 (saved as an adjustment movement)` : ""}. A new stock movement brings it back.`,
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await deleteEntry.mutateAsync(stock.id)
      toast("Stock deleted")
    } catch (err) {
      toast(err.message, "error")
    }
  }
  const { locationId, isAll, label } = useDashboardLocation()
  const locationName = useLocationName()
  const expiryQuery = useExpiryQuery()
  // One row per product and location; keep the chosen location's.
  const locationRows = useMemo(
    () => (expiryQuery.data || []).filter((row) => !locationId || row.location_id === locationId),
    [expiryQuery.data, locationId]
  )
  // Tabs: how the item is sold (whole packs, single units, or packs with single units too).
  const tabCounts = useMemo(() => {
    const out = { all: locationRows.length, pack: 0, loose: 0, pack_loose: 0 }
    for (const row of locationRows) out[stockKind(row)] += 1
    return out
  }, [locationRows])
  const [tab, setTab] = useTabParam(KIND_TABS, "all")
  const rows = useMemo(
    () => (tab === "all" ? locationRows : locationRows.filter((row) => stockKind(row) === tab)),
    [locationRows, tab]
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
    { key: "qty", header: "Qty", align: "right", sortValue: (row) => Number(row.stocks?.[0]?.qty || 0), render: (row) => (row.stocks?.[0] ? qtyLabel(row) : "—") },
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
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) =>
        row.stocks?.[0] ? (
          <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
            <Button variant="icon" aria-label="Edit stock" title="Edit" onClick={() => setEditing(row)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="icon" aria-label="Delete stock" title="Delete" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
          </div>
        ) : null,
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Catalog"
        title="Product Stock & Expiry"
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
      <Tabs
        tabs={KIND_TABS.map(([key, text]) => [key, `${text} (${tabCounts[key]})`])}
        value={tab}
        onChange={setTab}
        className="w-fit"
      />
      <DataTable
        title="Products"
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
      <StockEntryEditModal entry={editing} onClose={() => setEditing(null)} />
    </section>
  )
}
