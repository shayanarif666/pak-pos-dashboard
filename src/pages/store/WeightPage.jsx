import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Scale } from "lucide-react"
import { usePatchWeight, useProductsQuery, useWeightQuery } from "../../features/catalog/catalogQuery.jsx"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Button } from "../../ui/Button.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { toNumber } from "../../ui/format.js"
import { unitShort, withUnit } from "../../ui/units.js"

/** Weight Based Products: products sold by weight, their per-unit price and stock at the chosen location(s). */
export function WeightPage() {
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const { params, isAll, label } = useDashboardLocation()
  const weightQuery = useWeightQuery()
  // The catalog list carries each product's stock for the chosen location(s).
  const productsQuery = useProductsQuery(params.location_id ? { locationId: params.location_id } : {}, { sellable: true })
  const patchWeight = usePatchWeight()
  const [productId, setProductId] = useState("")
  const rows = useMemo(() => weightQuery.data || [], [weightQuery.data])
  const products = useMemo(() => productsQuery.data || [], [productsQuery.data])
  const stockOf = useMemo(() => {
    const map = new Map(products.map((row) => [row.id, (row.stocks || []).reduce((sum, s) => sum + Number(s.qty || 0), 0)]))
    return (id) => map.get(id) ?? 0
  }, [products])
  const candidates = products.filter((row) => !row.is_weight_based && row.is_active !== false)

  async function markWeight(event) {
    event.preventDefault()
    if (!productId) return
    try {
      await patchWeight.mutateAsync({ id: productId, is_weight_based: true })
      toast("Product marked as weight based")
      setProductId("")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function clearWeight(product) {
    const ok = await confirmToast({
      title: "Remove weight flag?",
      message: `${product.title} will no longer be sold by weight.`,
      confirmLabel: "Remove",
    })
    if (!ok) return
    try {
      await patchWeight.mutateAsync({ id: product.id, is_weight_based: false })
      toast("Weight flag removed")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  // Prices are per one unit of the product (e.g. per gm): "Rs. 1.6 / gm".
  const perUnit = (value, unit) => (
    <span className="whitespace-nowrap">
      <Currency value={value} />
      <span className="text-xs text-slate-400"> / {unitShort(unit)}</span>
    </span>
  )
  const columns = [
    {
      key: "title",
      header: "Product",
      render: (row) => (
        <div className="flex min-w-56 max-w-xs items-center gap-3">
          {row.image || row.featured_image ? (
            <img src={row.image || row.featured_image} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] text-slate-400">No img</div>
          )}
          <div className="min-w-0">
            {/* A variant: its own name, its product's name under it. */}
            <p className="truncate font-semibold text-slate-900" title={row.title}>{row.parent ? row.variant_name || row.title : row.title}</p>
            <p className="truncate text-xs text-slate-500" title={row.sku}>
              {row.parent ? `${row.parent.title} · #${row.parent.product_number} · Variant ${row.variant_number}` : `#${row.product_number}`} · {row.sku}
            </p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", sortValue: (row) => row.category?.name, render: (row) => <span className="whitespace-nowrap">{row.category?.name || "—"}</span> },
    { key: "selling_price", header: "Price", align: "right", sortValue: (row) => toNumber(row.selling_price), render: (row) => perUnit(row.selling_price, row.unit) },
    { key: "cost_price", header: "Cost", align: "right", sortValue: (row) => toNumber(row.cost_price), render: (row) => perUnit(row.cost_price, row.unit) },
    { key: "total_price_each_unit", header: "With tax", align: "right", sortValue: (row) => toNumber(row.total_price_each_unit), render: (row) => perUnit(row.total_price_each_unit, row.unit) },
    {
      key: "pack",
      header: "Pack",
      align: "right",
      sortValue: (row) => toNumber(row.pack_selling_price),
      render: (row) =>
        row.is_pack_product ? (
          <div className="whitespace-nowrap">
            <p className="font-medium text-slate-900">{withUnit(row.pack_size, row.unit)}</p>
            <p className="text-xs text-slate-500"><Currency value={row.pack_selling_price} /> / pack</p>
          </div>
        ) : (
          <span className="text-slate-400">Loose only</span>
        ),
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      sortValue: (row) => stockOf(row.id),
      render: (row) => {
        const qty = stockOf(row.id)
        const size = Number(row.pack_size)
        return (
          <div className="whitespace-nowrap">
            <p className={`font-semibold ${qty <= 0 ? "text-rose-700" : "text-slate-900"}`}>{withUnit(qty, row.unit)}</p>
            {row.is_pack_product && size >= 2 ? <p className="text-xs text-slate-500">{Math.floor(qty / size)} packs</p> : null}
          </div>
        )
      },
    },
    { key: "is_active", header: "Status", sortValue: (row) => (row.is_active ? 1 : 0), render: (row) => <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Disabled"}</Pill> },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" onClick={() => clearWeight(row)}>Remove</Button>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Catalog"
        title="Weight Based Products"
        description={`Products sold by weight on the POS scale (priced per ${rows[0]?.unit || "unit"}); a pack product can be sold by weight too. Stock is for ${isAll ? "all locations together" : label}.`}
      />
      <StatCards
        items={[
          { label: "Weight products", value: rows.length },
          { label: "Active", value: rows.filter((row) => row.is_active).length },
          { label: "Also sold in packs", value: rows.filter((row) => row.is_pack_product).length },
          { label: "Out of stock", value: rows.filter((row) => stockOf(row.id) <= 0).length },
        ]}
      />
      <form onSubmit={markWeight} className="flex flex-wrap items-end gap-3 rounded-[24px] border border-slate-200 bg-white p-4">
        <label className="min-w-64 flex-1 text-xs font-medium text-slate-500">
          <span className="mb-1 block">Sell another product by weight</span>
          <select
            className="select-ui h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none hover:border-slate-400 focus:border-brand-700"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            <option value="">Choose a product…</option>
            {candidates.map((row) => (
              <option key={row.id} value={row.id}>{row.title} ({row.unit})</option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={!productId || patchWeight.isPending}>
          <Scale className="h-4 w-4" /> Mark as weight based
        </Button>
      </form>
      <DataTable
        title="Weight Based Products"
        columns={columns}
        rows={rows}
        loading={weightQuery.isPending}
        error={weightQuery.error}
        search={{ placeholder: "Search product or SKU…", text: (row) => `${row.title} ${row.sku} ${row.barcode || ""} ${row.product_number ?? row.parent?.product_number ?? ""}` }}
        filters={[
          {
            key: "category",
            label: "Category",
            options: [...new Map(rows.filter((row) => row.category).map((row) => [row.category.id, row.category.name])).entries()].map(([value, text]) => ({ value, label: text })),
            match: (row, value) => row.category?.id === value,
          },
          { key: "pack", label: "Pack", options: [{ value: "yes", label: "Also in packs" }, { value: "no", label: "Loose only" }], match: (row, value) => (row.is_pack_product ? "yes" : "no") === value },
          { key: "stock", label: "Stock", options: [{ value: "in", label: "In stock" }, { value: "out", label: "Out of stock" }], match: (row, value) => (stockOf(row.id) > 0 ? "in" : "out") === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "title", dir: "asc" }}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
        emptyText="No products are sold by weight yet."
      />
    </section>
  )
}
