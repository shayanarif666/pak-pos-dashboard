import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, Pencil, Plus, Trash2 } from "lucide-react"
import { useCategoriesQuery, useDisableProduct, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { toNumber } from "../../ui/format.js"

function productType(row) {
  if (row.is_pack_product && row.is_weight_based) return "pack_weight"
  if (row.is_pack_product) return "pack"
  if (row.is_weight_based) return "weight"
  return "loose"
}
const TYPE_LABEL = { loose: "Loose", pack: "Pack", weight: "Weight", pack_weight: "Pack + weight" }

function stockOf(row) {
  const stocks = row.stocks || []
  return {
    qty: stocks.reduce((sum, stock) => sum + Number(stock.qty || 0), 0),
    low: stocks.some((stock) => stock.is_low),
  }
}
function stockStatus(row) {
  const { qty, low } = stockOf(row)
  if (qty <= 0) return "out"
  return low ? "low" : "in"
}

function taxText(row) {
  const taxes = row.taxes || []
  if (!taxes.length) return "—"
  return taxes.map((tax) => `${tax.name} ${tax.type === "percentage" ? `${Number(tax.value)}%` : `Rs ${Number(tax.value)}`}`).join(", ")
}

/** Products: the store's catalog with each product's stock at the chosen location(s). */
export function ProductsPage() {
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const { params, isAll, label } = useDashboardLocation()
  const disableProduct = useDisableProduct()
  const categoriesQuery = useCategoriesQuery()
  const productsQuery = useProductsQuery(params.location_id ? { locationId: params.location_id } : {})
  const categories = categoriesQuery.data || []
  const rows = useMemo(() => productsQuery.data || [], [productsQuery.data])

  const totals = useMemo(() => {
    const statuses = rows.map(stockStatus)
    return {
      products: rows.length,
      active: rows.filter((row) => row.is_active).length,
      low: statuses.filter((value) => value === "low").length,
      out: statuses.filter((value) => value === "out").length,
    }
  }, [rows])

  async function remove(product) {
    const ok = await confirmToast({
      title: "Disable product?",
      message: `${product.title} will be hidden store-wide. Stock at each location is kept.`,
      confirmLabel: "Disable",
    })
    if (!ok) return
    try {
      await disableProduct.mutateAsync(product.id)
      toast("Product disabled")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const columns = [
    {
      key: "title",
      header: "Product",
      render: (row) => (
        <div className="flex min-w-48 items-center gap-3">
          {row.featured_image || row.image_url ? (
            <img src={row.featured_image || row.image_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] text-slate-400">No img</div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{row.title}</p>
            <p className="text-xs text-slate-500">#{row.product_number} · {row.unit}</p>
          </div>
        </div>
      ),
    },
    { key: "sku", header: "SKU / Barcode", render: (row) => (<div className="text-xs"><p className="font-mono text-slate-700">{row.sku}</p><p className="font-mono text-slate-400">{row.barcode || "—"}</p></div>) },
    { key: "category", header: "Category", sortValue: (row) => row.category?.name, render: (row) => row.category?.name || "—" },
    { key: "type", header: "Type", sortValue: productType, render: (row) => <Pill tone="violet" dot={false}>{TYPE_LABEL[productType(row)]}</Pill> },
    { key: "cost_price", header: "Cost", align: "right", sortValue: (row) => toNumber(row.cost_price), render: (row) => <Currency value={row.cost_price} /> },
    { key: "selling_price", header: "Price", align: "right", sortValue: (row) => toNumber(row.selling_price), render: (row) => <Currency value={row.selling_price} /> },
    {
      key: "pack",
      header: "Pack",
      align: "right",
      sortValue: (row) => toNumber(row.pack_selling_price),
      render: (row) => (row.is_pack_product ? (<span>{row.pack_size} × · <Currency value={row.pack_selling_price} /></span>) : "—"),
    },
    { key: "taxes", header: "Taxes", sortable: false, className: "max-w-48 text-xs", render: taxText },
    {
      key: "discount",
      header: "Discount",
      sortValue: (row) => toNumber(row.discount_value),
      render: (row) =>
        row.discount_type && Number(row.discount_value) > 0
          ? row.discount_type === "percentage" ? `${Number(row.discount_value)}%` : <Currency value={row.discount_value} />
          : "—",
    },
    {
      key: "stock",
      header: isAll ? "Stock (all)" : "Stock",
      align: "right",
      sortValue: (row) => stockOf(row).qty,
      render: (row) => {
        const status = stockStatus(row)
        return (
          <span className={status === "out" ? "font-semibold text-rose-700" : status === "low" ? "font-semibold text-amber-700" : "font-semibold text-slate-900"}>
            {stockOf(row).qty}
          </span>
        )
      },
    },
    { key: "is_active", header: "Status", sortValue: (row) => (row.is_active ? 1 : 0), render: (row) => <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Disabled"}</Pill> },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Link to={`/products/${row.id}`}><Button variant="icon" aria-label="View product"><Eye className="h-4 w-4" /></Button></Link>
          <Link to={`/products/${row.id}/edit`}><Button variant="icon" aria-label="Edit product"><Pencil className="h-4 w-4" /></Button></Link>
          {row.is_active ? (
            <Button variant="icon" aria-label="Disable product" onClick={() => remove(row)}><Trash2 className="h-4 w-4" /></Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Catalog"
        title="Products"
        description={`Products belong to the whole store; stock is shown for ${isAll ? "all locations together" : label}.`}
        actions={
          <Link to="/products/new">
            <Button><Plus className="h-4 w-4" /> Add product</Button>
          </Link>
        }
      />
      <StatCards
        items={[
          { label: "Products", value: totals.products },
          { label: "Active", value: totals.active },
          { label: "Low stock", value: totals.low },
          { label: "Out of stock", value: totals.out },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={productsQuery.isPending}
        error={productsQuery.error || categoriesQuery.error}
        search={{ placeholder: "Search title, SKU or barcode…", text: (row) => `${row.title} ${row.sku} ${row.barcode} ${row.product_number}` }}
        filters={[
          { key: "category", label: "Category", options: categories.map((row) => ({ value: row.id, label: row.name })), match: (row, value) => row.category_id === value },
          { key: "type", label: "Type", options: Object.entries(TYPE_LABEL).map(([value, text]) => ({ value, label: text })), match: (row, value) => productType(row) === value },
          { key: "stock", label: "Stock", options: [{ value: "in", label: "In stock" }, { value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }], match: (row, value) => stockStatus(row) === value },
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }], match: (row, value) => (row.is_active ? "active" : "disabled") === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "title", dir: "asc" }}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
        emptyText="No products yet — add your first product."
      />
    </section>
  )
}
