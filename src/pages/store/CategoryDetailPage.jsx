import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Eye, Pencil, Plus } from "lucide-react"
import { useCategoriesQuery, useCategoryQuery } from "../../features/catalog/catalogQuery.jsx"
import { CategoryFormModal } from "../../features/catalog/CategoryFormModal.jsx"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
import { Button } from "../../ui/Button.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { formatDate, toNumber } from "../../ui/format.js"

const STOCK_TONE = { out: "font-semibold text-rose-700", low: "font-semibold text-amber-700", in: "font-semibold text-slate-900" }

function rule(type, value, name) {
  if (!type || value == null || value === "") return "—"
  const amount = type === "percentage" ? `${Number(value)}%` : <Currency value={value} />
  return name ? <>{name} · {amount}</> : amount
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{children ?? "—"}</dd>
    </div>
  )
}

/** Category detail: the category, its totals and every product in it — all from GET /categories/:id. */
export function CategoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const scope = useDashboardLocation()
  const query = useCategoryQuery(id, { locationId: scope.isAdmin ? scope.locationId : "" })
  const category = query.data
  const categoriesQuery = useCategoriesQuery()
  const [editing, setEditing] = useState(false)
  const summary = category?.summary || {}
  const products = category?.products || []

  const back = (
    <Link to="/categories" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700">
      <ArrowLeft className="h-4 w-4" />
      Back to categories
    </Link>
  )

  if (query.isPending) return <PageLoader label="Loading category…" />
  if (query.error || !category) {
    return (
      <section className="space-y-4">
        {back}
        <p className="text-sm text-rose-700">{query.error?.message || "Category not found."}</p>
      </section>
    )
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
            <p className="text-xs text-slate-500">#{row.product_number} · {row.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "barcode", header: "Barcode", render: (row) => <span className="font-mono text-xs">{row.barcode || "—"}</span> },
    { key: "cost_price", header: "Cost", align: "right", sortValue: (row) => toNumber(row.cost_price), render: (row) => <Currency value={row.cost_price} /> },
    { key: "selling_price", header: "Price", align: "right", sortValue: (row) => toNumber(row.selling_price), render: (row) => <Currency value={row.selling_price} /> },
    {
      key: "discount",
      header: "Product discount",
      sortValue: (row) => toNumber(row.discount_value),
      render: (row) => (row.has_product_discount ? rule(row.discount_type, row.discount_value) : "—"),
    },
    {
      key: "total_qty",
      header: scope.isAll ? "Stock (all)" : "Stock",
      align: "right",
      sortValue: (row) => toNumber(row.total_qty),
      render: (row) => <span className={STOCK_TONE[row.stock_status] || STOCK_TONE.in}>{row.total_qty ?? 0}</span>,
    },
    { key: "is_active", header: "Status", sortValue: (row) => (row.is_active ? 1 : 0), render: (row) => <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Disabled"}</Pill> },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <Link to={`/products/${row.id}`}><Button variant="icon" aria-label="View product"><Eye className="h-4 w-4" /></Button></Link>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-6">
      {back}
      <PageHeader
        section={`Category #${category.category_number}`}
        title={category.name}
        description={category.description || `Every product in ${category.name}, with stock for ${scope.isAll || !scope.isAdmin ? scope.label.toLowerCase() : scope.label}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={`/products?category=${category.category_number}`}>
              <Button variant="ghost">Open in Products</Button>
            </Link>
            <Button onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        }
      />

      <StatCards
        items={[
          { label: "Products", value: summary.products ?? 0, hint: `${summary.active_products ?? 0} active · ${summary.inactive_products ?? 0} disabled` },
          { label: "Units in stock", value: summary.total_qty ?? 0, hint: `${summary.low_stock_products ?? 0} low · ${summary.out_of_stock_products ?? 0} out of stock` },
          { label: "Stock value (selling)", value: <Currency value={summary.selling_value} /> },
          { label: "Stock value (cost)", value: <Currency value={summary.cost_value} /> },
        ]}
      />

      <div className="flex flex-wrap items-start gap-5 rounded-[24px] border border-slate-200 bg-white p-5">
        {category.image_url ? (
          <img src={category.image_url} alt="" className="h-20 w-20 rounded-2xl border border-slate-200 object-cover" />
        ) : null}
        <dl className="grid flex-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Status"><Pill tone={category.is_active ? "emerald" : "rose"}>{category.is_active ? "Active" : "Off"}</Pill></Detail>
          <Detail label="Slug">{category.slug}</Detail>
          <Detail label="Category discount">{rule(category.discount_type, category.discount_value, category.discount_name)}</Detail>
          <Detail label="Parent">{(categoriesQuery.data || []).find((row) => row.id === category.parent_category_id)?.name || "—"}</Detail>
          <Detail label="Category tax">{rule(category.tax_type, category.tax_value, category.tax_name)}</Detail>
          <Detail label="Shown on">
            <span className="inline-flex gap-1">
              <Pill tone={category.is_pos_visible ? "sky" : "zinc"} dot={false}>POS</Pill>
              <Pill tone={category.is_web_visible ? "fuchsia" : "zinc"} dot={false}>Web</Pill>
            </span>
          </Detail>
          <Detail label="Sold at"><LocationScopePills row={category} /></Detail>
          <Detail label="Sort order">{category.sort_order ?? "—"}</Detail>
          <Detail label="Created">{formatDate(category.created_at)}</Detail>
          <Detail label="Updated">{formatDate(category.updated_at)}</Detail>
        </dl>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">Products in {category.name}</h2>
          <Link to="/products/new"><Button><Plus className="h-4 w-4" /> Add product</Button></Link>
        </div>
        <DataTable
          title="Products in this category"
          columns={columns}
          rows={products}
          search={{ placeholder: "Search title, SKU or barcode…", text: (row) => `${row.title} ${row.sku} ${row.barcode} ${row.product_number}` }}
          filters={[
            { key: "stock", label: "Stock", options: [{ value: "in", label: "In stock" }, { value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }], match: (row, value) => row.stock_status === value },
            { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }], match: (row, value) => (row.is_active ? "active" : "disabled") === value },
          ]}
          dateRange={{ label: "Added on", value: (row) => row.created_at }}
          initialSort={{ key: "title", dir: "asc" }}
          onRowClick={(row) => navigate(`/products/${row.id}`)}
          emptyText="No products in this category yet."
        />
      </div>
      <CategoryFormModal
        open={editing}
        category={category}
        categories={categoriesQuery.data || []}
        onClose={() => setEditing(false)}
      />
    </section>
  )
}
