import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Eye, Pencil, Plus, Trash2 } from "lucide-react"
import { useCategoriesQuery, useDisableProduct, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
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

// Stock total and status come from the API (total_qty, stock_status: in / low / out).
const STOCK_TONE = { out: "font-semibold text-rose-700", low: "font-semibold text-amber-700", in: "font-semibold text-slate-900" }

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
  const [searchParams] = useSearchParams()
  // Category filter is sent to the API as category_id (?category= opens the page filtered).
  const [categoryId, setCategoryId] = useState(searchParams.get("category") || "")
  const productsQuery = useProductsQuery({
    ...(params.location_id ? { locationId: params.location_id } : {}),
    ...(categoryId ? { category_id: categoryId } : {}),
  })
  const categories = categoriesQuery.data || []
  // A deleted product is switched off (soft delete) and is no longer listed.
  const rows = useMemo(() => (productsQuery.data || []).filter((row) => row.is_active !== false), [productsQuery.data])

  const totals = useMemo(() => {
    const statuses = rows.map((row) => row.stock_status)
    return {
      products: rows.length,
      active: rows.filter((row) => row.is_active).length,
      low: statuses.filter((value) => value === "low").length,
      out: statuses.filter((value) => value === "out").length,
    }
  }, [rows])

  // Delete is a soft delete: the product is switched off (is_active false) and leaves the table.
  async function remove(product) {
    const ok = await confirmToast({
      title: "Delete product?",
      message: `${product.title}${product.has_variants ? " and its variants" : ""} will be removed from the catalog and no longer sold. Its stock and sales history are kept.`,
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await disableProduct.mutateAsync(product.id)
      toast(`${product.title} deleted`)
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
    {
      key: "category",
      header: "Category",
      sortValue: (row) => row.category?.name,
      render: (row) =>
        row.category ? (
          <Link to={`/categories/${row.category.category_number ?? row.category.id}`} onClick={(event) => event.stopPropagation()} className="hover:underline">
            {row.category.name}
          </Link>
        ) : "—",
    },
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
      sortValue: (row) => toNumber(row.total_qty),
      render: (row) => <span className={STOCK_TONE[row.stock_status] || STOCK_TONE.in}>{row.total_qty ?? 0}</span>,
    },
    {
      key: "locations",
      header: "Sold at",
      sortValue: (row) => (row.location_scope === "selected" ? (row.locations || []).length : 0),
      render: (row) => <LocationScopePills row={row} />,
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
          <Button variant="icon" aria-label="Delete product" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
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
          { key: "category", label: "Category", server: true, options: categories.map((row) => ({ value: String(row.category_number), label: row.name })) },
          { key: "type", label: "Type", options: Object.entries(TYPE_LABEL).map(([value, text]) => ({ value, label: text })), match: (row, value) => productType(row) === value },
          { key: "stock", label: "Stock", options: [{ value: "in", label: "In stock" }, { value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }], match: (row, value) => row.stock_status === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "title", dir: "asc" }}
        initialFilters={categoryId ? { category: categoryId } : {}}
        onFiltersChange={(values) => setCategoryId(values.category || "")}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
        emptyText="No products yet — add your first product."
      />
    </section>
  )
}
