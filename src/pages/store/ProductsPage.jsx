import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Eye, Pencil, Plus, Trash2 } from "lucide-react"
import {
  useCategoriesQuery,
  useDisableProduct,
  useProductsQuery,
} from "../../features/catalog/catalogQuery.jsx"
import { useAuth } from "../../auth/AuthContext.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

export function ProductsPage() {
  const { user, location } = useAuth()
  const { toast, confirmToast } = useToast()
  const [q, setQ] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [filters, setFilters] = useState({ q: "", categoryId: "" })
  const disableProduct = useDisableProduct()

  const queryFilters = {
    q: filters.q,
    categoryId: filters.categoryId,
    locationId: user.role === "manager" ? location?.id : undefined,
  }

  const categoriesQuery = useCategoriesQuery()
  const productsQuery = useProductsQuery(queryFilters)
  const categories = categoriesQuery.data || []
  const products = productsQuery.data || []
  const loading = categoriesQuery.isPending || productsQuery.isPending
  const error = categoriesQuery.error?.message || productsQuery.error?.message || ""

  const locationHint =
    user.role === "manager"
      ? location?.name
        ? `Catalog is store-wide. Stock below is for ${location.name}.`
        : "Catalog is store-wide. Stock is for your assigned location."
      : "Products belong to the whole store. Quantity is managed per location."

  function search(event) {
    event.preventDefault()
    setFilters({ q, categoryId })
  }

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

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((row) => [row.id, row.name]))
    return (id) => map.get(id) || "—"
  }, [categories])

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Products</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{locationHint}</p>
        </div>
        <Link to="/products/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        </Link>
      </div>

      <form
        onSubmit={search}
        className="mb-6 grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]"
      >
        <Input
          label="Search"
          placeholder="Title, SKU, barcode"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button type="submit" variant="ghost" className="w-full">
            Filter
          </Button>
        </div>
      </form>

      {loading ? <PageLoader label="Loading products…" /> : null}
      {error ? <p className="mb-4 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const qty = (product.stocks || []).reduce((sum, row) => sum + Number(row.qty || 0), 0)
          const low = (product.stocks || []).some((row) => row.is_low)
          return (
            <article
              key={product.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
            >
              <div className="flex items-start gap-3">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xs text-slate-500">
                    No img
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-slate-900">{product.title}</h2>
                  <p className="truncate text-xs text-slate-500">SKU {product.sku}</p>
                  <p className="mt-1 text-sm text-slate-600">{categoryName(product.category_id)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Pill tone="violet">
                  <Currency value={product.selling_price} />
                </Pill>
                <Pill tone={product.is_active ? "emerald" : "rose"}>
                  {product.is_active ? "Active" : "Disabled"}
                </Pill>
                <Pill tone={product.is_published ? "sky" : "zinc"}>
                  {product.is_published ? "Published" : "Draft"}
                </Pill>
                <Pill tone={low ? "rose" : "zinc"}>
                  {user.role === "manager" ? `Qty ${qty}` : `Stock rows ${product.stocks?.length || 0}`}
                </Pill>
              </div>
              <div className="mt-5 flex gap-2">
                <Link to={`/products/${product.id}`}>
                  <Button variant="icon" aria-label="View product">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to={`/products/${product.id}/edit`}>
                  <Button variant="icon" aria-label="Edit product">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="icon" aria-label="Disable product" onClick={() => remove(product)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      {!loading && !products.length ? (
        <p className="mt-8 text-sm text-slate-500">No products match these filters.</p>
      ) : null}
    </section>
  )
}
