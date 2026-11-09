import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Eye, Pencil, Plus, Power, Trash2 } from "lucide-react"
import { ProductStatusModal } from "../../features/catalog/ProductBulkModals.jsx"
import { SelectionBar } from "../../ui/SelectionBar.jsx"
import { useCategoriesQuery, useDisableProduct, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Button } from "../../ui/Button.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { toNumber } from "../../ui/format.js"
import { rowsToTables } from "../../lib/exportFile.js"
import { ExportButton } from "../../ui/ExportButton.jsx"

function productType(row) {
  if (row.is_pack_product && row.is_weight_based) return "pack_weight"
  if (row.is_pack_product) return "pack"
  if (row.is_weight_based) return "weight"
  return "loose"
}
const TYPE_LABEL = { loose: "Loose", pack: "Pack", weight: "Weight", pack_weight: "Pack + weight" }

// Stock total and status come from the API (total_qty, stock_status: in / low / out).

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
  // Every product; the Status filter starts on Active. A deleted product is a disabled one
  // (soft delete), so it shows under Status: Disabled and can be switched back on from there.
  const rows = useMemo(() => productsQuery.data || [], [productsQuery.data])

  const totals = useMemo(() => {
    const active = rows.filter((row) => row.is_active)
    const statuses = active.map((row) => row.stock_status)
    return {
      products: rows.length,
      active: active.length,
      low: statuses.filter((value) => value === "low").length,
      out: statuses.filter((value) => value === "out").length,
    }
  }, [rows])

  // Tick products, then Update Status switches all of them on or off at once.
  const [selectedIds, setSelectedIds] = useState([])
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.id)), [rows, selectedIds])
  const [statusOpen, setStatusOpen] = useState(false)
  const clearSelection = () => setSelectedIds([])

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
    { key: "product_number", header: "Product #", sortValue: (row) => Number(row.product_number), render: (row) => <span className="font-semibold text-slate-900">#{row.product_number}</span> },
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div className="flex min-w-44 items-center gap-3">
          {row.featured_image || row.image_url ? (
            <img src={row.featured_image || row.image_url} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] text-slate-400">No img</div>
          )}
          <p className="truncate font-semibold text-slate-900">{row.title}</p>
        </div>
      ),
    },
    { key: "sku", header: "SKU", sortValue: (row) => row.sku || "", render: (row) => <span className="font-mono text-xs text-slate-700">{row.sku || "—"}</span> },
    { key: "barcode", header: "Barcode", render: (row) => <span className="font-mono text-xs text-slate-700">{row.barcode || "—"}</span> },
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
    {
      // A product with variants: how many it has; its price and stock are each variant's (on its detail page).
      key: "total_variants",
      header: "Total variants",
      sortValue: (row) => (row.has_variants ? (row.variants || []).length : -1),
      render: (row) => (row.has_variants ? (row.variants || []).length : "—"),
    },
    {
      key: "price",
      header: "Price",
      sortValue: (row) => (row.has_variants ? -1 : Number(row.selling_price || 0)),
      render: (row) => (row.has_variants ? "—" : <Currency value={row.selling_price} />),
    },
    {
      key: "stock",
      header: "Stock",
      sortValue: (row) => (row.has_variants ? -1 : toNumber(row.total_qty ?? row.qty) ?? 0),
      render: (row) => (row.has_variants ? "—" : toNumber(row.total_qty ?? row.qty) ?? 0),
    },
    { key: "is_active", header: "Status", sortValue: (row) => (row.is_active ? 1 : 0), render: (row) => <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Disabled"}</Pill> },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Link to={`/products/${row.id}`}><Button variant="icon" aria-label="View product" title="View"><Eye className="h-4 w-4" /></Button></Link>
          <Link to={`/products/${row.id}/edit`}><Button variant="icon" aria-label="Edit product" title="Edit"><Pencil className="h-4 w-4" /></Button></Link>
          <Button variant="icon" aria-label="Delete product" title="Delete" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
        </div>
      ),
    },
  ]

  return (
    <section className={`space-y-6 ${selectedRows.length ? "pb-24" : ""}`}>
      <PageHeader
        section="Catalog"
        title="Products"
        description={`Products belong to the whole store; stock is shown for ${isAll ? "all locations together" : label}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton name="products" getTables={() => rowsToTables("Products", rows)} disabled={productsQuery.isPending} />
            <Link to="/products/new">
              <Button className="h-11"><Plus className="h-4 w-4" /> Add product</Button>
            </Link>
          </div>
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
        title="Products"
        columns={columns}
        rows={rows}
        loading={productsQuery.isPending}
        error={productsQuery.error || categoriesQuery.error}
        search={{ placeholder: "Search title, SKU or barcode…", text: (row) => `${row.title} ${row.sku} ${row.barcode} ${row.product_number}` }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }], match: (row, value) => (row.is_active ? "active" : "disabled") === value },
          { key: "category", label: "Category", server: true, options: categories.map((row) => ({ value: String(row.category_number), label: row.name })) },
          { key: "type", label: "Type", options: Object.entries(TYPE_LABEL).map(([value, text]) => ({ value, label: text })), match: (row, value) => productType(row) === value },
          { key: "stock", label: "Stock", options: [{ value: "in", label: "In stock" }, { value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }], match: (row, value) => row.stock_status === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "title", dir: "asc" }}
        initialFilters={{ status: "active", ...(categoryId ? { category: categoryId } : {}) }}
        onFiltersChange={(values) => setCategoryId(values.category || "")}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
        emptyText="No products yet — add your first product."
        selection={{ selected: selectedIds, onChange: setSelectedIds }}
      />

      <SelectionBar count={selectedRows.length} noun={["product", "products"]} onClear={clearSelection}>
        <Button onClick={() => setStatusOpen(true)}>
          <Power className="h-4 w-4" /> Update Status
        </Button>
      </SelectionBar>

      <ProductStatusModal open={statusOpen} products={selectedRows} onClose={() => setStatusOpen(false)} onSaved={clearSelection} />
    </section>
  )
}

