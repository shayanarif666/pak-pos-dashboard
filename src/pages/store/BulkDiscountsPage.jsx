import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, Pencil, Plus, Trash2, X } from "lucide-react"
import { useCategoriesQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useBulkDiscountsQuery as useOffersQuery, useDeleteBulkDiscount as useDeleteOffer, useSaveBulkDiscount as useSaveOffer } from "../../features/discounts/discountQuery.js"
import { LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
import { Currency, formatCurrency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { Select } from "../../ui/Select.jsx"
import { Switch } from "../../ui/Switch.jsx"
import { useToast } from "../../ui/Toast.jsx"

/*
 * Bulk Discounts (POST /bulk-discounts): buy X, get Y free. Each one applies to several products and / or
 * categories: { name, products: [{ product_id, sale_unit?, free_product_id? }], categories: [ids],
 * sale_unit, buy_qty + buy_unit, get_qty + get_unit, start_at, end_at, is_active, location_scope,
 * location_ids }. The type is always bogo, so it is never sent.
 *
 * Pack products: each one says whether the discount is for a single item, the whole pack or both
 * (sale_unit); categories use the discount's own sale_unit.
 */

// On a pack product: what the discount applies to.
const SALE_UNIT_LABEL = { unit: "Single item", pack: "Full pack", both: "Both" }
const COUNT_UNIT_LABEL = { unit: "Single items", pack: "Packs" }

const isPack = (product) => Boolean(product?.is_pack_product) && Number(product?.pack_size) >= 2
/** unit | pack | both for this product (a pack sold only whole: pack). */
function effectiveSaleUnit(product, own, fallback) {
  if (!isPack(product)) return "unit"
  if (!product.sell_loose) return "pack"
  return own || fallback || "both"
}

const TYPE_LABEL = { bogo: "Buy X get Y" }

/** Running now: switched on and inside its start / end window. */
function offerState(row, now = Date.now()) {
  if (!row.is_active) return "inactive"
  if (row.start_at && new Date(row.start_at).getTime() > now) return "scheduled"
  if (row.end_at && new Date(row.end_at).getTime() < now) return "expired"
  return "running"
}

const STATE_PILL = {
  running: { tone: "emerald", label: "Running" },
  scheduled: { tone: "sky", label: "Scheduled" },
  expired: { tone: "amber", label: "Expired" },
  inactive: { tone: "zinc", label: "Inactive" },
}

const countText = (qty, unit) => `${qty ?? "?"}${unit === "pack" ? ` pack${Number(qty) === 1 ? "" : "s"}` : ""}`

function discountText(row) {
  if (row.type === "bogo") return `Buy ${countText(row.buy_qty, row.buy_unit)} get ${countText(row.get_qty, row.get_unit)}`
  if (row.discount_value == null) return row.type === "flash_sale" ? "Sale prices" : "—"
  const amount = row.discount_type === "percentage" ? `${row.discount_value}%` : formatCurrency(row.discount_value)
  return row.type === "bulk_discount" ? `${amount} from ${countText(row.min_qty, row.min_qty_unit)}` : amount
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Open"
}

/** "6 Nov 2026" for the table (the full time shows on hover). */
function shortDate(value) {
  return value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "Open"
}

function Info({ label, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{children}</div>
    </div>
  )
}

export function BulkDiscountsPage() {
  const { toast, confirmToast } = useToast()
  const navigate = useNavigate()
  const deleteOffer = useDeleteOffer()
  const [selected, setSelected] = useState(null)
  const [toggling, setToggling] = useState({})

  const offersQuery = useOffersQuery()
  const productsQuery = useProductsQuery({}, { sellable: true })
  const categoriesQuery = useCategoriesQuery()
  const saveOffer = useSaveOffer()

  const offers = offersQuery.data || []
  const categories = categoriesQuery.data || []
  const productById = useMemo(() => new Map((productsQuery.data || []).map((row) => [row.id, row])), [productsQuery.data])
  const categoryById = useMemo(() => new Map(categories.map((row) => [row.id, row])), [categories])

  const productTargets = (row) => (row.targets || []).filter((t) => t.product_id)
  const categoryTargets = (row) => (row.targets || []).filter((t) => t.category_id)
  function appliesTo(row) {
    const names = [
      ...productTargets(row).map((t) => productById.get(t.product_id)?.title || "Product"),
      ...categoryTargets(row).map((t) => categoryById.get(t.category_id)?.name || "Category"),
    ]
    if (!names.length) return "—"
    return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ")
  }

  // Add / edit open their own page.
  const openCreate = () => navigate("/bulk-discounts/new")
  const openEdit = (row) => navigate(`/bulk-discounts/${row.id}/edit`)

  async function toggleActive(row, next) {
    setToggling((current) => ({ ...current, [row.id]: true }))
    try {
      await saveOffer.mutateAsync({ id: row.id, body: { is_active: next } })
      toast(next ? `${row.name} is active` : `${row.name} is inactive`)
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setToggling((current) => ({ ...current, [row.id]: false }))
    }
  }

  // Soft delete: the discount leaves the list and the POS at once; sales made with it keep it.
  async function remove(row) {
    const ok = await confirmToast({
      title: `Delete ${row.name}?`,
      message: "It stops at checkout and leaves the list and the POS. Sales already made with it keep their discount.",
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await deleteOffer.mutateAsync(row.id)
      toast(`${row.name} deleted`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const now = Date.now()
  const columns = [
    {
      key: "name",
      header: "Discount",
      render: (row) => (
        <div className="min-w-40 max-w-56">
          <p className="truncate font-semibold text-slate-900" title={row.name}>{row.name}</p>
          <p className="text-xs text-slate-500">#{row.offer_number} · {TYPE_LABEL[row.type] || row.type}</p>
          <p className="mt-0.5 text-xs font-semibold text-brand-700">{discountText(row)}</p>
        </div>
      ),
    },
    {
      key: "applies",
      header: "Applies to",
      sortable: false,
      render: (row) => (
        <div className="min-w-36 max-w-52">
          <p className="truncate text-slate-900" title={appliesTo(row)}>{appliesTo(row)}</p>
          <p className="text-xs text-slate-500">
            {productTargets(row).length} product{productTargets(row).length === 1 ? "" : "s"} · {categoryTargets(row).length} categor{categoryTargets(row).length === 1 ? "y" : "ies"}
          </p>
        </div>
      ),
    },
    {
      key: "window",
      header: "Runs",
      sortValue: (row) => row.start_at || "",
      render: (row) => (
        <div className="whitespace-nowrap text-xs text-slate-700" title={`${formatDate(row.start_at)} → ${formatDate(row.end_at)}`}>
          <p>{shortDate(row.start_at)}</p>
          <p className="text-slate-500">to {shortDate(row.end_at)}</p>
        </div>
      ),
    },
    { key: "locations", header: "Locations", sortable: false, render: (row) => <div className="whitespace-nowrap"><LocationScopePills row={row} /></div> },
    {
      key: "state",
      header: "Status",
      sortValue: (row) => offerState(row, now),
      render: (row) => {
        const state = STATE_PILL[offerState(row, now)]
        return <Pill tone={state.tone}>{state.label}</Pill>
      },
    },
    {
      key: "is_active",
      header: "Active",
      sortValue: (row) => (row.is_active ? 1 : 0),
      render: (row) => (
        <Switch checked={Boolean(row.is_active)} disabled={Boolean(toggling[row.id])} label={row.is_active ? `Turn off ${row.name}` : `Turn on ${row.name}`} onChange={(next) => toggleActive(row, next)} />
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="icon" aria-label="View discount" title="View" onClick={() => setSelected(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label="Edit discount" title="Edit" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label="Delete discount" title="Delete" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Discounts"
        title="Bulk Discounts"
        description="Buy some, get some free: on several products and categories at once. Switch one off to stop it at checkout; switch it back on any time."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add bulk discount</Button>}
      />

      <StatCards
        items={[
          { label: "Bulk discounts", value: offers.length },
          { label: "Running now", value: offers.filter((row) => offerState(row, now) === "running").length },
          { label: "Scheduled", value: offers.filter((row) => offerState(row, now) === "scheduled").length },
          { label: "Inactive", value: offers.filter((row) => !row.is_active).length, hint: `${offers.filter((row) => offerState(row, now) === "expired").length} expired` },
        ]}
      />

      <DataTable
        title="Bulk discounts"
        columns={columns}
        rows={offers}
        loading={offersQuery.isPending}
        error={offersQuery.error}
        search={{ placeholder: "Search discount, product or category…", text: (row) => `${row.name} ${row.offer_number} ${appliesTo(row)}` }}
        filters={[
          { key: "status", label: "Status", options: Object.entries(STATE_PILL).map(([value, state]) => ({ value, label: state.label })), match: (row, value) => offerState(row, now) === value },
          { key: "apply_to", label: "Applies to", options: [{ value: "product", label: "Products" }, { value: "category", label: "Categories" }, { value: "mixed", label: "Both" }], match: (row, value) => row.apply_to === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(row) => setSelected(row)}
        emptyText="No bulk discounts yet."
      />

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Discount #{selected.offer_number}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Pill tone={STATE_PILL[offerState(selected)].tone}>{STATE_PILL[offerState(selected)].label}</Pill>
                  <Pill tone="zinc" dot={false}>{TYPE_LABEL[selected.type] || selected.type}</Pill>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { const row = selected; setSelected(null); openEdit(row) }}><Pencil className="h-4 w-4" /> Edit</Button>
                <button type="button" className="text-slate-600 hover:text-brand-700" onClick={() => setSelected(null)} aria-label="Close"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Discount">{discountText(selected)}</Info>
              <Info label="Applies to">{selected.apply_to === "mixed" ? "Products and categories" : selected.apply_to === "product" ? "Products" : "Categories"}</Info>
              {selected.type === "bogo" ? (
                <Info label="Buy / get free">
                  {selected.buy_qty} {COUNT_UNIT_LABEL[selected.buy_unit || "unit"].toLowerCase()} / {selected.get_qty} {COUNT_UNIT_LABEL[selected.get_unit || "unit"].toLowerCase()}
                </Info>
              ) : null}
              <Info label="On pack products">{SALE_UNIT_LABEL[selected.sale_unit || "both"]}</Info>
              <Info label="Starts">{formatDate(selected.start_at)}</Info>
              <Info label="Ends">{formatDate(selected.end_at)}</Info>
              <Info label="Runs at"><LocationScopePills row={selected} /></Info>
              <Info label="Added">{formatDate(selected.created_at)}</Info>
              <Info label="Last changed">{formatDate(selected.updated_at)}</Info>
            </div>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Products ({productTargets(selected).length})</h3>
            {productTargets(selected).length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="ui-table w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Price</th>
                      <th className="px-4 py-2.5 font-semibold">For</th>
                      {selected.type === "flash_sale" ? <th className="px-4 py-2.5 text-right font-semibold">Sale price</th> : null}
                      {selected.type === "bogo" ? <th className="px-4 py-2.5 font-semibold">Free item</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {productTargets(selected).map((t) => {
                      const product = productById.get(t.product_id)
                      return (
                        <tr key={t.id} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 text-slate-900">{product?.title || "Product"}</td>
                          <td className="px-4 py-2.5 text-right">
                            {product ? <Currency value={product.selling_price} /> : "—"}
                            {isPack(product) ? <span className="block text-xs text-slate-500">pack {formatCurrency(product.pack_selling_price)}</span> : null}
                          </td>
                          <td className="px-4 py-2.5 text-xs">{isPack(product) ? SALE_UNIT_LABEL[effectiveSaleUnit(product, t.sale_unit, selected.sale_unit)] : "Single item"}</td>
                          {selected.type === "flash_sale" ? (
                            <td className="px-4 py-2.5 text-right font-semibold">
                              {t.promo_price == null && t.promo_pack_price == null ? discountText(selected) : null}
                              {t.promo_price != null ? <span className="block"><Currency value={t.promo_price} /></span> : null}
                              {t.promo_pack_price != null ? <span className="block text-xs">pack <Currency value={t.promo_pack_price} /></span> : null}
                            </td>
                          ) : null}
                          {selected.type === "bogo" ? <td className="px-4 py-2.5">{t.free_product_id ? productById.get(t.free_product_id)?.title || "Product" : "Same product"}</td> : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No single products.</p>
            )}

            <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-900">Categories ({categoryTargets(selected).length})</h3>
            {categoryTargets(selected).length ? (
              <div className="flex flex-wrap gap-2">
                {categoryTargets(selected).map((t) => (
                  <Pill key={t.id} tone="sky" dot={false}>{categoryById.get(t.category_id)?.name || "Category"}</Pill>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No categories.</p>
            )}
          </div>
        ) : null}
      </Modal>
    </section>
  )
}

