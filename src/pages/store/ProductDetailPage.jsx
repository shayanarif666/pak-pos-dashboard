import { Link, useParams } from "react-router-dom"
import { Pencil } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useBulkTiersQuery, useProductQuery } from "../../features/catalog/catalogQuery.jsx"
import { resolveDashboardLocation } from "../../features/catalog/dashboardLocation.js"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"

import { PageLoader } from "../../ui/Spinner.jsx"
import { Pill } from "../../ui/Pill.jsx"

function Card({ title, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[65%] text-right text-slate-900">{value ?? "—"}</span>
    </div>
  )
}

function yesNo(value) {
  return value ? "Yes" : "No"
}

function formatDate(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString()
}

function discountLabel(type, value) {
  if (!type || value == null || value === "") return "—"
  return type === "percentage" ? `${value}%` : <Currency value={value} />
}

function StockRows({ stocks, product, emptyLabel }) {
  if (!stocks.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>
  }

  return (
    <div className="space-y-3">
      {stocks.map((row) => (
        <div
          key={row.id || row.location_id}
          className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">
              {row.location_name || `Location #${row.location_number}`}
            </p>
            <Pill tone={row.is_low ? "rose" : "emerald"}>
              {row.is_low ? "Low" : "OK"} · {row.qty}
            </Pill>
          </div>
          <div className="mt-2 space-y-1">
            <Row label="Location #" value={row.location_number} />
            <Row label="Quantity" value={String(row.qty)} />
            <Row
              label="Low stock threshold"
              value={
                row.effective_threshold ??
                row.low_stock_threshold ??
                product.low_stock_threshold
              }
            />
            <Row label="Expiry" value={row.expiry_date || product.expiry_date || "—"} />
            {product.is_pack_product ? (
              <Row label="Number of packs" value={row.number_of_packs} />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProductDetailPage() {
  const { id } = useParams()
  const auth = useAuth()
  const isAdmin = auth.user?.role === "store_admin"
  const dashboardLocation = resolveDashboardLocation(auth)
  const productQuery = useProductQuery(
    id,
    isAdmin ? {} : { locationId: dashboardLocation?.id },
  )
  const tiersQuery = useBulkTiersQuery(id)
  const product = productQuery.data
  const tiers = tiersQuery.data || []
  const error = productQuery.error?.message || tiersQuery.error?.message || ""

  if (error) return <p className="text-sm text-rose-700">{error}</p>
  if (productQuery.isPending || !product) return <PageLoader label="Loading product…" />

  const allStocks = Array.isArray(product.stocks) ? product.stocks : []
  const stocks = isAdmin
    ? [...allStocks].sort(
        (a, b) => Number(a.location_number || 0) - Number(b.location_number || 0)
      )
    : allStocks.filter((row) => row.location_id === dashboardLocation?.id).length
      ? allStocks.filter((row) => row.location_id === dashboardLocation?.id)
      : allStocks

  const quantity = stocks.reduce((sum, row) => sum + Number(row.qty || 0), 0)
  const packSize = Number(product.pack_size || 0)
  const costPerUnit = Number(product.cost_price || 0)
  const sellPerUnit = Number(product.selling_price || 0)
  const numberOfPacks =
    product.is_pack_product && packSize >= 2 ? Math.floor(quantity / packSize) : null
  const unitsInFullPacks =
    numberOfPacks != null ? numberOfPacks * packSize : quantity
  const totalCostOfPacks = unitsInFullPacks * costPerUnit
  const totalSellingOfPacks = unitsInFullPacks * sellPerUnit

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {product.image_url ? (
            <img
              src={product.featured_image || product.image_url}
              alt=""
              className="h-20 w-20 rounded-3xl object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-xs text-slate-500">
              No img
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Product
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{product.title}</h1>
            <p className="mt-1 text-sm text-slate-600">SKU {product.sku}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={product.is_active ? "emerald" : "rose"}>
                {product.is_active ? "Active" : "Disabled"}
              </Pill>
              <Pill tone={product.is_published ? "sky" : "zinc"}>
                {product.is_published ? "Published" : "Draft"}
              </Pill>
              <Pill tone={product.is_pos_visible ? "sky" : "zinc"}>POS</Pill>
              <Pill tone={product.is_web_visible ? "fuchsia" : "zinc"}>Web</Pill>
            </div>
          </div>
        </div>
        <Link to={`/products/${product.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Details">
          <Row label="Category" value={product.category?.name} />
          <Row label="Slug" value={product.slug} />
          <Row label="Barcode" value={product.barcode} />
          <Row label="Unit" value={product.unit} />
          <Row label="Cost price" value={<Currency value={product.cost_price} />} />
          <Row label="Selling price" value={<Currency value={product.selling_price} />} />
          <Row label="Channel" value={product.channel} />
          <Row label="Created" value={formatDate(product.created_at)} />
          <Row label="Updated" value={formatDate(product.updated_at)} />
        </Card>

        <Card title={isAdmin ? "Stock · all locations" : `Stock · ${dashboardLocation?.name || "Current location"}`}>
          {isAdmin ? (
            <p className="mb-3 text-xs text-slate-500">
              Quantity for every branch. Empty locations show as zero until stock is set.
            </p>
          ) : dashboardLocation ? (
            <p className="mb-3 text-xs text-slate-500">
              Quantity for your assigned location only.
            </p>
          ) : (
            <p className="mb-3 text-xs text-amber-700">
              No location is attached to this login, so stock cannot be scoped.
            </p>
          )}
          <StockRows
            stocks={stocks}
            product={product}
            emptyLabel={
              isAdmin
                ? "No stock rows yet for any location."
                : "No stock at your location yet."
            }
          />
          <div className="mt-4">
            <Link to="/inventory" className="text-sm text-brand-700 hover:text-brand-700">
              Manage stock
            </Link>
          </div>
        </Card>

        <Card title="Pricing & tax">
          <Row label="Product discount" value={yesNo(product.has_product_discount)} />
          <Row
            label="Discount"
            value={
              product.has_product_discount
                ? discountLabel(product.discount_type, product.discount_value)
                : "—"
            }
          />
          <Row label="Tax" value={discountLabel(product.tax_type, product.tax_value)} />
          <Row label="Category tax" value={discountLabel(product.category?.tax_type, product.category?.tax_value)} />
          <Row
            label="Category discount"
            value={discountLabel(product.category?.discount_type, product.category?.discount_value)}
          />
          <Row label="Bulk discount" value={yesNo(product.has_bulk_discount)} />
        </Card>

        <Card title="Pack & weight">
          <Row label="Pack product" value={yesNo(product.is_pack_product)} />
          <Row label="Pack size" value={product.pack_size ?? "—"} />
          <Row label="Quantity" value={String(quantity)} />
          <Row label="Cost price / unit" value={<Currency value={product.cost_price} />} />
          <Row label="Selling price / unit" value={<Currency value={product.selling_price} />} />
          {product.is_pack_product && numberOfPacks != null ? (
            <Row label="Number of packs" value={String(numberOfPacks)} />
          ) : null}
          <Row label="Total cost price of all packs" value={<Currency value={totalCostOfPacks} />} />
          <Row
            label="Total selling price of all packs"
            value={<Currency value={totalSellingOfPacks} />}
          />
          <Row label="Sell loose" value={yesNo(product.sell_loose)} />
          <Row label="Weight based" value={yesNo(product.is_weight_based)} />
          <Row label="Product expiry" value={product.expiry_date || "—"} />
          <Row label="Default low stock" value={product.low_stock_threshold} />
        </Card>
      </div>

      {(() => {
        const gallery = Array.isArray(product.images)
          ? product.images.map((item) => item?.url).filter(Boolean)
          : []
        const featured = product.featured_image || product.image_url
        const urls = [...gallery]
        if (featured && !urls.includes(featured)) urls.unshift(featured)
        if (!urls.length) return null
        return (
          <Card title="Images">
            <div className="flex flex-wrap gap-3">
              {urls.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                  {url === featured ? (
                    <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1.5 text-xs font-semibold text-black">
                      Featured
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        )
      })()}

      {product.description ? (
        <Card title="Description">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{product.description}</p>
        </Card>
      ) : null}

      {tiers.length ? (
        <Card title="Bulk tiers">
          <div className="space-y-2">
            {tiers.map((tier) => (
              <div key={`${tier.min_qty}-${tier.discount_type}`} className="flex justify-between text-sm">
                <span className="text-slate-500">From {tier.min_qty} units</span>
                <span className="text-slate-900">
                  {discountLabel(tier.discount_type, tier.discount_value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
