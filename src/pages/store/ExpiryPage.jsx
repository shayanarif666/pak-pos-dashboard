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
import { withUnit } from "../../ui/units.js"

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
  if (stockKind(row) === "loose" || !(size >= 2)) return withUnit(qty, row.unit)
  const packs = Math.floor(qty / size)
  const loose = Math.round((qty - packs * size) * 10000) / 10000
  return `${withUnit(qty, row.unit)} (${packs} ${packs === 1 ? "pack" : "packs"}${loose ? ` + ${withUnit(loose, row.unit)}` : ""})`
}

function daysLeft(date) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${String(date).slice(0, 10)}T00:00:00`) - today) / 86400000)
}

/** Product Stock & Expiry: the stock of every product at the chosen location(s), lot by lot. */
export function ExpiryPage() {
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const { deleteEntry } = useStockEdit()
  const [editing, setEditing] = useState(null) // { entry, lot }

  // Soft delete of one lot: its qty goes to 0 through an adjustment movement, the other lots stay.
  async function removeLot(row, lot) {
    const ok = await confirmToast({
      title: `Delete lot #${lot.id}?`,
      message: `${row.title} at ${locationName(row.location_id)}: its ${lotQty(row, lot)} ${lot.expiry_date ? `(expiring ${formatDate(lot.expiry_date)}) ` : ""}go to 0 — saved as an adjustment movement. The other lots stay.`,
      confirmLabel: "Delete lot",
    })
    if (!ok) return
    try {
      await deleteEntry.mutateAsync({ id: lot.id, product_id: row.id, location_id: row.location_id })
      toast(`Lot #${lot.id} deleted`)
    } catch (err) {
      toast(err.message, "error")
    }
  }
  const { locationId, isAll, label } = useDashboardLocation()
  const locationName = useLocationName()
  const expiryQuery = useExpiryQuery()
  // The API gives one row per lot; here one row per product and location, with all its lots.
  const locationRows = useMemo(() => {
    const byStock = new Map()
    for (const row of expiryQuery.data || []) {
      if (locationId && row.location_id !== locationId) continue
      const key = `${row.id}|${row.location_id}`
      if (byStock.has(key)) continue
      const lots = row.stocks?.[0]?.lots || (row.lot ? [row.lot] : [])
      const soonest = lots.find((lot) => lot.expiry_date) || null
      byStock.set(key, {
        ...row,
        lots,
        expiry_date: soonest?.expiry_date || null,
        expiry_status: soonest?.expiry_status || "none",
      })
    }
    return [...byStock.values()]
  }, [expiryQuery.data, locationId])
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
  // The cards count lots (each lot has its own expiry).
  const counts = useMemo(() => {
    const lots = rows.flatMap((row) => row.lots)
    return Object.fromEntries(STATUSES.map(([key]) => [key, lots.filter((lot) => lot.expiry_status === key).length]))
  }, [rows])

  const columns = [
    {
      key: "title",
      header: "Product",
      render: (row) => (
        <div className="flex min-w-52 items-center gap-3">
          {row.image || row.featured_image ? (
            <img src={row.image || row.featured_image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-50" />
          )}
          <div>
            <p className="font-semibold text-slate-900">{row.title}</p>
            <p className="text-xs text-slate-500">{productNumberText(row)} · {row.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", sortValue: (row) => row.category?.name, render: (row) => row.category?.name || "—" },
    ...(isAll ? [{ key: "location", header: "Location", sortValue: (row) => locationName(row.location_id), render: (row) => locationName(row.location_id) }] : []),
    { key: "qty", header: "Total", align: "right", sortValue: (row) => Number(row.stocks?.[0]?.qty || 0), render: (row) => (row.stocks?.[0] ? qtyLabel(row) : "—") },
    {
      key: "lots",
      header: "Lots",
      sortValue: (row) => row.lots.length,
      // Open the row (▸) to see each lot.
      render: (row) => <span className="text-sm text-slate-700">{row.lots.length} {row.lots.length === 1 ? "lot" : "lots"}</span>,
    },
    { key: "expiry_date", header: "Soonest expiry", sortValue: (row) => (row.expiry_date ? new Date(row.expiry_date) : new Date("9999-12-31")), render: (row) => (row.expiry_date ? formatDate(row.expiry_date) : "—") },
    {
      key: "expiry_status",
      header: "Status",
      sortValue: (row) => ["expired", "critical", "warning", "ok", "none"].indexOf(row.expiry_status),
      render: (row) => (row.expiry_status === "none" ? <span className="text-xs text-slate-500">No expiry</span> : <StatusBadge value={row.expiry_status} tone={expiryTone(row.expiry_status)} />),
    },
  ]


  /** The lots of a product at a location, under its row: one line each with its own edit / delete. */
  const renderLots = (row) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white" onClick={(event) => event.stopPropagation()}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr className="border-b border-slate-200">
            <th className="px-4 py-2.5 font-semibold">Lot #</th>
            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
            <th className="px-3 py-2.5 font-semibold">Expiry date</th>
            <th className="px-3 py-2.5 text-right font-semibold">Days left</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Received</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {row.lots.map((lot) => (
            <tr key={lot.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2.5 font-semibold text-slate-900">#{lot.id}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">{lotQty(row, lot)}</td>
              <td className="px-3 py-2.5 text-slate-700">{lot.expiry_date ? formatDate(lot.expiry_date) : <span className="text-slate-500">No expiry</span>}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {lot.days_left == null ? "—" : lot.days_left < 0 ? <span className="font-semibold text-rose-700">{Math.abs(lot.days_left)} days ago</span> : lot.days_left}
              </td>
              <td className="px-3 py-2.5">{lot.expiry_status ? <StatusBadge value={lot.expiry_status} tone={expiryTone(lot.expiry_status)} /> : <span className="text-xs text-slate-500">—</span>}</td>
              <td className="px-3 py-2.5 text-xs text-slate-500">{lot.received_at ? formatDate(lot.received_at) : "—"}</td>
              <td className="px-4 py-2.5">
                <div className="flex justify-end gap-1">
                  <Button variant="icon" aria-label={`Edit lot ${lot.id}`} title="Edit lot" onClick={() => setEditing({ entry: row, lot })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="icon" aria-label={`Delete lot ${lot.id}`} title="Delete lot" onClick={() => removeLot(row, lot)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <section className="space-y-6">
      <PageHeader
        section="Catalog"
        title="Product Stock & Expiry"
        description={`The stock at ${isAll ? "every location" : label}, lot by lot: stock that came in together with its own expiry date. A sale takes the lot that expires first. Critical and warning windows come from the store's expiry settings.`}
      />
      <StatCards
        items={[
          { label: "Expired lots", value: counts.expired },
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
        renderExpanded={renderLots}
        loading={expiryQuery.isPending}
        error={expiryQuery.error}
        search={{ placeholder: "Search product or SKU…", text: (row) => `${row.title} ${row.sku} ${row.barcode || ""} ${productNumberText(row)}` }}
        filters={[
          {
            key: "expiry_status",
            label: "Status",
            options: [...STATUSES, ["none", "No expiry"]].map(([value, text]) => ({ value, label: text })),
            // A product matches when any of its lots has that status.
            match: (row, value) => (value === "none" ? row.lots.some((lot) => !lot.expiry_date) : row.lots.some((lot) => lot.expiry_status === value)),
          },
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
        emptyText="No stock yet."
      />
      <StockEntryEditModal entry={editing?.entry || null} lot={editing?.lot || null} onClose={() => setEditing(null)} />
    </section>
  )
}

/** "#1" for a product; "#1 · variant 2" for a variant (variants have no product number of their own). */
function productNumberText(row) {
  if (row.parent) return `#${row.parent.product_number} · variant ${row.variant_number}`
  return `#${row.product_number}`
}

/** A lot's qty: "25" for a loose item; "25 (5 packs)" / "27 (5 packs + 2)" for a pack item. */
function lotQty(row, lot) {
  const qty = Number(lot.qty || 0)
  const size = Number(row.pack_size)
  if (stockKind(row) === "loose" || !(size >= 2)) return withUnit(qty, row.unit)
  const packs = Math.floor(qty / size)
  const loose = Math.round((qty - packs * size) * 10000) / 10000
  return `${withUnit(qty, row.unit)} (${packs} ${packs === 1 ? "pack" : "packs"}${loose ? ` + ${withUnit(loose, row.unit)}` : ""})`
}
