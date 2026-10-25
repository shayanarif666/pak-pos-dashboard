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

/** Weight Based Products: products sold by weight, their per-unit price and stock at the chosen location(s). */
export function WeightPage() {
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const { params, isAll, label } = useDashboardLocation()
  const weightQuery = useWeightQuery()
  // The catalog list carries each product's stock for the chosen location(s).
  const productsQuery = useProductsQuery(params.location_id ? { locationId: params.location_id } : {})
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
    { key: "unit", header: "Unit", render: (row) => row.unit || "—" },
    { key: "selling_price", header: "Price / unit", align: "right", sortValue: (row) => toNumber(row.selling_price), render: (row) => <Currency value={row.selling_price} /> },
    { key: "cost_price", header: "Cost / unit", align: "right", sortValue: (row) => toNumber(row.cost_price), render: (row) => <Currency value={row.cost_price} /> },
    {
      key: "pack",
      header: "Pack",
      align: "right",
      sortValue: (row) => toNumber(row.pack_selling_price),
      render: (row) => (row.is_pack_product ? <span>{row.pack_size} {row.unit} · <Currency value={row.pack_selling_price} /></span> : "—"),
    },
    { key: "total_price_each_unit", header: "With tax / unit", align: "right", sortValue: (row) => toNumber(row.total_price_each_unit), render: (row) => <Currency value={row.total_price_each_unit} /> },
    { key: "stock", header: isAll ? "Stock (all)" : "Stock", align: "right", sortValue: (row) => stockOf(row.id), render: (row) => <span className="font-semibold">{stockOf(row.id)}</span> },
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600"
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
        columns={columns}
        rows={rows}
        loading={weightQuery.isPending}
        error={weightQuery.error}
        search={{ placeholder: "Search product or SKU…", text: (row) => `${row.title} ${row.sku} ${row.barcode || ""} ${row.product_number}` }}
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
