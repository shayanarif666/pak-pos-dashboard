import { StatCards } from "../../ui/PageHeader.jsx"
import { useState } from "react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { resolveDashboardLocation } from "../../features/catalog/dashboardLocation.js"
import { useLocationsQuery, useProductQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
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
  const { toast } = useToast()
  const isAdmin = auth.user.role === "store_admin"
  const tokenLocation = resolveDashboardLocation(auth)
  const scope = useDashboardLocation()
  const staffName = useStaffNames()
  const [form, setForm] = useState({
    product_id: "",
    movement_type: "stock_in",
    reason: "purchase",
    reason_note: "",
  })
  // Quantities: { "variantKey|locationId": { qty, expiry_date } } (variantKey = variant number or "product").
  const [qtys, setQtys] = useState({})

  const [showForm, setShowForm] = useState(false)
  const closeForm = () => setShowForm(false)
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const productsQuery = useProductsQuery()
  const movementsQuery = useStockMovementsQuery(scope.locationId ? { locationId: scope.locationId } : {})
  const createMovement = useCreateStockMovement()
  // The picked product's detail: its variants and the branches it is sold at.
  const productQuery = useProductQuery(form.product_id, {}, { enabled: Boolean(form.product_id) })
  const picked = form.product_id ? productQuery.data : null

  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const products = productsQuery.data || []
  const rows = movementsQuery.data || []
  const loading = movementsQuery.isPending
  // Branches to fill in: where the product is sold (a manager: their own).
  const moveLocations = !picked
    ? []
    : isAdmin
      ? picked.location_scope === "selected"
        ? locations.filter((row) => (picked.location_ids || []).includes(row.id))
        : locations
      : tokenLocation
        ? [tokenLocation]
        : []
  const targets = !picked
    ? []
    : picked.has_variants
      ? (picked.variants || []).map((variant) => ({ key: String(variant.variant_number), label: variant.name, stocks: variant.stocks || [] }))
      : [{ key: "product", label: picked.title, stocks: picked.stocks || [] }]
  const qtyKey = (key, locationId) => `${key}|${locationId}`
  const patchQty = (key, locationId, field, value) =>
    setQtys((current) => {
      const id = qtyKey(key, locationId)
      return { ...current, [id]: { ...(current[id] || { qty: "", expiry_date: "" }), [field]: value } }
    })

  async function save(event) {
    event.preventDefault()
    const rowsOf = (key) =>
      moveLocations
        .map((location) => {
          const row = qtys[qtyKey(key, location.id)]
          if (!row || row.qty === "" || Number(row.qty) === 0) return null
          return { location_id: location.id, qty: Number(row.qty), ...(row.expiry_date ? { expiry_date: row.expiry_date } : {}) }
        })
        .filter(Boolean)
    const body = {
      product_id: form.product_id,
      movement_type: form.movement_type,
      reason: form.reason,
      reason_note: form.reason_note || null,
    }
    if (picked?.has_variants) {
      body.variants = targets.map((target) => ({ id: Number(target.key), stock: rowsOf(target.key) })).filter((row) => row.stock.length)
      if (!body.variants.length) return toast("Enter a quantity for at least one variant and branch", "error")
    } else {
      body.stock = rowsOf("product")
      if (!body.stock.length) return toast("Enter a quantity for at least one branch", "error")
    }
    try {
      const json = await createMovement.mutateAsync(body)
      const failed = json?.data?.failed || []
      toast(failed.length ? `Saved, but ${failed.length} failed: ${failed.map((row) => row.message).join(" · ")}` : "Movement recorded", failed.length ? "error" : undefined)
      setShowForm(false)
      setQtys({})
      setForm((current) => ({ ...current, reason_note: "" }))
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
          onChange={(e) => {
            setForm({ ...form, product_id: e.target.value })
            setQtys({})
          }}
        >
          <option value="">Select product</option>
          {products.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </Select>
        <Select
          label="Type"
          value={form.movement_type}
          onChange={(e) => setForm({ ...form, movement_type: e.target.value, reason: REASONS_BY_TYPE[e.target.value][0] })}
        >
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {label(type)}
            </option>
          ))}
        </Select>
        <Select
          label="Reason"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        >
          {REASONS_BY_TYPE[form.movement_type].map((reason) => (
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
      </div>
      {form.product_id ? (
        productQuery.isPending ? (
          <p className="mt-4 text-sm text-slate-500">Loading product…</p>
        ) : !moveLocations.length ? (
          <p className="mt-4 text-sm text-slate-500">This product is not sold at any branch you can move stock at.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              {form.movement_type === "adjustment"
                ? "Qty with a sign: +5 adds, -5 takes away."
                : form.movement_type === "stock_out"
                  ? "Quantity that left (in units)."
                  : "Quantity that came in (in units)."}{" "}
              Leave a branch empty to skip it.
            </p>
            {targets.map((target) => (
              <div key={target.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                {picked?.has_variants ? (
                  <p className="mb-2 text-sm font-semibold text-slate-900">
                    <span className="mr-2 text-xs font-normal text-slate-400">#{target.key}</span>
                    {target.label}
                  </p>
                ) : null}
                <div className="space-y-2">
                  {moveLocations.map((location) => {
                    const row = qtys[qtyKey(target.key, location.id)] || { qty: "", expiry_date: "" }
                    const now = target.stocks.find((stock) => stock.location_id === location.id)
                    return (
                      <div key={location.id} className="grid items-end gap-3 md:grid-cols-[minmax(0,1.2fr)_1fr_1fr]">
                        <div className="pb-2.5">
                          <p className="text-sm font-medium text-slate-800">{location.name}</p>
                          <p className="text-xs text-slate-500">In stock: {now ? Number(now.qty) : 0}</p>
                        </div>
                        <Input label="Qty" type="number" step="0.01" value={row.qty} onChange={(e) => patchQty(target.key, location.id, "qty", e.target.value)} />
                        {form.movement_type === "stock_in" ? (
                          <Input label="Expiry (optional)" type="date" value={row.expiry_date} onChange={(e) => patchQty(target.key, location.id, "expiry_date", e.target.value)} />
                        ) : (
                          <span />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={createMovement.isPending || !picked}>
          {createMovement.isPending ? "Saving…" : "Record movement"}
        </Button>
      </div>
      </ModalCard>
      </Modal>

      <StatCards
        items={[
          { label: "Movements", value: rows.length },
          { label: "Stock in", value: rows.filter((row) => Number(row.qty) > 0).length },
          { label: "Stock out", value: rows.filter((row) => Number(row.qty) < 0).length },
          { label: "Last 24 hours", value: rows.filter((row) => new Date(row.created_at) > new Date(Date.now() - 86400000)).length },
        ]}
      />
      <DataTable
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
