import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Pencil } from "lucide-react"
import { useProductQuery } from "../../features/catalog/catalogQuery.jsx"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { StatCards } from "../../ui/PageHeader.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { formatDate } from "../../ui/format.js"

/*
 * Product detail. Every figure here comes from GET /products/:id as sent (summary.pricing and
 * summary.stock are worked out by the API); the page only lays them out.
 */

function Card({ title, description, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[65%] text-right text-slate-900">{value ?? "—"}</span>
    </div>
  )
}

const money = (value) => (value == null ? "—" : <Currency value={value} />)
const yesNo = (value) => (value ? "Yes" : "No")

/** Taxes as "GST 18% · Sugar tax Rs. 5 / unit". */
function taxList(taxes) {
  if (!taxes?.length) return "—"
  return taxes.map((tax, index) => (
    <span key={`${tax.name}-${index}`}>
      {index ? " · " : ""}
      {tax.name || `Tax ${index + 1}`} {tax.type === "percentage" ? `${Number(tax.value)}%` : <><Currency value={tax.value} /> / unit</>}
    </span>
  ))
}

/** Stock per location of one product or variant. */
function StockTable({ stocks, isPack }) {
  if (!stocks.length) return <p className="text-sm text-slate-500">No stock recorded yet.</p>
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="border-y border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-5 py-2.5 font-semibold">Location</th>
            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
            {isPack ? <th className="px-3 py-2.5 text-right font-semibold">Packs</th> : null}
            <th className="px-3 py-2.5 text-right font-semibold">Sold</th>
            <th className="px-3 py-2.5 text-right font-semibold">Low at</th>
            <th className="px-3 py-2.5 font-semibold">Expiry</th>
            <th className="px-5 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((row) => (
            <tr key={row.id || row.location_id} className="border-b border-slate-100 last:border-0">
              <td className="px-5 py-2.5 font-medium text-slate-950">{row.location_name || `Location #${row.location_number}`}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{row.qty}</td>
              {isPack ? <td className="px-3 py-2.5 text-right tabular-nums">{row.number_of_packs ?? "—"}</td> : null}
              <td className="px-3 py-2.5 text-right tabular-nums">{row.unit_sold}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{row.effective_threshold ?? "—"}</td>
              <td className="px-3 py-2.5">{row.expiry_date ? formatDate(row.expiry_date) : "—"}</td>
              <td className="px-5 py-2.5"><Pill tone={row.is_low ? "rose" : "emerald"}>{row.is_low ? "Low" : "OK"}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Where its stock is held: every location it is sold at, or the selected ones. */
const stockHeldAt = (product) => (
  <LocationScopePills row={{ location_scope: product.stock_scope, locations: product.stock_locations || [] }} />
)

/** One variant: its own prices / pack, its own taxes and its stock per location. */
function VariantCard({ variant }) {
  const stocks = variant.stocks || []
  const qty = Number(variant.total_qty ?? stocks.reduce((sum, row) => sum + Number(row.qty || 0), 0))
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            <span className="mr-2 text-xs font-normal text-slate-400">#{variant.variant_number}</span>
            {variant.name}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">SKU {variant.sku} · {variant.barcode || "no barcode"}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={variant.is_pack_product ? "sky" : "zinc"}>{variant.is_pack_product ? `Pack of ${variant.pack_size}` : "Loose"}</Pill>
          <Pill tone={variant.is_active === false ? "rose" : "emerald"}>{variant.is_active === false ? "Disabled" : "Active"}</Pill>
          <Pill tone={variant.stock_status === "out" ? "rose" : variant.stock_status === "low" ? "amber" : "emerald"}>{qty} in stock</Pill>
        </div>
      </div>
      <div className="mt-3 grid gap-x-8 md:grid-cols-2">
        <div>
          {variant.is_pack_product ? (
            <>
              <Row label="Pack size" value={variant.pack_size} />
              <Row label="Pack cost" value={money(variant.pack_cost_price)} />
              <Row label="Pack price" value={money(variant.pack_selling_price)} />
              <Row label="Single units sold too" value={yesNo(variant.sell_loose)} />
            </>
          ) : null}
          <Row label="Cost / unit" value={money(variant.cost_price)} />
          <Row label="Price / unit" value={money(variant.selling_price)} strong />
        </div>
        <div>
          <Row label="Own taxes" value={taxList(variant.variant_taxes)} />
          <Row label="All taxes" value={taxList(variant.taxes)} />
          <Row label="Stock value at cost" value={money(qty * Number(variant.cost_price || 0))} />
          <Row label="Stock value at price" value={money(qty * Number(variant.selling_price || 0))} />
        </div>
      </div>
      <div className="mt-3">
        <StockTable stocks={stocks} isPack={variant.is_pack_product} />
      </div>
    </section>
  )
}

/** "5%" or "Rs. 5" with its name, as set on the product / category. */
function rule(type, value, name) {
  if (!type || value == null || value === "") return "—"
  const amount = type === "percentage" ? `${Number(value)}%` : <Currency value={value} />
  return name ? <>{name} · {amount}</> : amount
}

export function ProductDetailPage() {
  const { id } = useParams()
  const scope = useDashboardLocation()
  // Store admin: the location picked in the top bar (none = every location). A manager's stock
  // is limited to their own location by the API.
  const productQuery = useProductQuery(id, scope.isAdmin ? { locationId: scope.locationId || undefined } : {})
  const product = productQuery.data
  const error = productQuery.error?.message || ""

  if (error) return <p className="text-sm text-rose-700">{error}</p>
  if (productQuery.isPending || !product) return <PageLoader label="Loading product…" />

  const pricing = product.summary?.pricing || {}
  const stock = product.summary?.stock || {}
  const stocks = product.stocks || []
  const category = product.category
  // One image per product.
  const featured = product.featured_image || product.image_url
  const taxes = product.taxes || []

  const header = (
    <>
      <Link to="/products" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {featured ? (
            <a href={featured} target="_blank" rel="noreferrer">
              <img src={featured} alt="" className="h-28 w-28 rounded-2xl border border-slate-200 object-cover" />
            </a>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
              No image
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{product.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              #{product.product_number} · SKU {product.sku}
              {product.barcode ? ` · ${product.barcode}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={product.is_active ? "emerald" : "rose"}>{product.is_active ? "Active" : "Disabled"}</Pill>
              <Pill tone={product.is_published ? "sky" : "zinc"}>{product.is_published ? "Published" : "Draft"}</Pill>
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
    </>
  )

  // A product with variants: the product groups them; prices, pack and stock are each variant's.
  if (product.has_variants) {
    const variants = product.variants || []
    const totalOf = (key) => variants.reduce((sum, row) => sum + Number(row.total_qty || 0) * Number(row[key] || 0), 0)
    const totalQty = variants.reduce((sum, row) => sum + Number(row.total_qty || 0), 0)
    return (
      <div className="space-y-6">
        {header}
        <StatCards
          items={[
            { label: "Variants", value: variants.length, hint: `${variants.filter((row) => row.is_active !== false).length} active` },
            { label: "In stock", value: totalQty, hint: `${variants.filter((row) => row.stock_status === "low").length} low · ${variants.filter((row) => row.stock_status === "out").length} out` },
            { label: "Stock value (selling)", value: money(totalOf("selling_price")), hint: <>At cost <Currency value={totalOf("cost_price")} /></> },
            { label: "Category", value: category?.name || "—", hint: product.unit },
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Details">
            <Row
              label="Category"
              value={category ? <Link to={`/categories/${category.category_number ?? category.id}`} className="font-medium underline-offset-2 hover:underline">{category.name}</Link> : "—"}
            />
            <Row label="Sold at" value={<LocationScopePills row={product} />} />
            <Row label="Stock held at" value={stockHeldAt(product)} />
            <Row label="Slug" value={product.slug} />
            <Row label="SKU" value={product.sku} />
            <Row label="Barcode" value={product.barcode} />
            <Row label="Unit" value={product.unit} />
            <Row label="Default low stock" value={product.low_stock_threshold} />
            <Row label="Created" value={formatDate(product.created_at)} />
            <Row label="Updated" value={formatDate(product.updated_at)} />
          </Card>
          <Card title="Taxes and discount" description="The product's taxes apply to every variant; a variant may add its own.">
            <Row label="Product taxes" value={taxList(taxes)} />
            <Row label="Product discount" value={rule(product.discount_type, product.discount_value, product.discount_name)} />
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Row label="Category tax" value={rule(category?.tax_type, category?.tax_value, category?.tax_name)} />
              <Row label="Category discount" value={rule(category?.discount_type, category?.discount_value, category?.discount_name)} />
              <Row label="Sales tax" value={pricing.sales_tax_rate ? `${pricing.sales_tax_rate}%` : "Off"} />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-950">
            Variants{scope.isAdmin && !scope.isAll ? <span className="ml-2 text-sm font-normal text-slate-500">stock at {scope.label}</span> : null}
          </h2>
          {variants.map((variant) => <VariantCard key={variant.id} variant={variant} />)}
        </div>
        {product.description ? (
          <Card title="Description">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{product.description}</p>
          </Card>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      <StatCards
        items={[
          { label: "Selling price", value: money(pricing.selling_price), hint: <>After discounts <Currency value={pricing.price_after_discount} /></> },
          { label: "Customer pays / unit", value: money(pricing.price_with_tax), hint: <>Tax <Currency value={pricing.tax_amount} /></> },
          { label: "In stock", value: stock.total_qty ?? 0, hint: `${stock.locations ?? 0} location${stock.locations === 1 ? "" : "s"} · ${stock.low_stock_locations ?? 0} low` },
          { label: "Stock value (selling)", value: money(stock.selling_value), hint: <>At cost <Currency value={stock.cost_value} /></> },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Details">
          <Row
            label="Category"
            value={category ? <Link to={`/categories/${category.category_number ?? category.id}`} className="font-medium underline-offset-2 hover:underline">{category.name}</Link> : "—"}
          />
          {product.parent_product_id ? (
            <Row label="Variant of" value={<Link to={`/products/${product.parent_product_id}`} className="font-medium underline-offset-2 hover:underline">{product.variant_name ? `${product.variant_name} · open parent` : "Open parent"}</Link>} />
          ) : null}
          <Row label="Sold at" value={<LocationScopePills row={product} />} />
          {product.parent_product_id ? null : <Row label="Stock held at" value={stockHeldAt(product)} />}
          {category?.location_scope === "selected" ? (
            <Row label="Category sold at" value={<LocationScopePills row={category} />} />
          ) : null}
          <Row label="Slug" value={product.slug} />
          <Row label="Barcode" value={product.barcode} />
          <Row label="Unit" value={product.unit} />
          <Row label="Weight based" value={yesNo(product.is_weight_based)} />
          <Row label="Sell loose" value={yesNo(product.sell_loose)} />
          <Row label="Default low stock" value={product.low_stock_threshold} />
          <Row label="Created" value={formatDate(product.created_at)} />
          <Row label="Updated" value={formatDate(product.updated_at)} />
        </Card>

        <Card title="Price of one unit" description="As a sale charges it: the product discount, then the category discount on the rest, then the taxes on that.">
          <Row label="Selling price" value={money(pricing.selling_price)} />
          {Number(pricing.product_discount_amount) > 0 ? (
            <Row label={<>Product discount <span className="text-xs">({rule(product.discount_type, product.discount_value, product.discount_name)})</span></>} value={<>−{money(pricing.product_discount_amount)}</>} />
          ) : null}
          <Row label={<>Category discount <span className="text-xs">({rule(category?.discount_type, category?.discount_value, category?.discount_name)})</span></>} value={<>−{money(pricing.category_discount_amount)}</>} />
          <Row label="Price after discounts" value={money(pricing.price_after_discount)} strong />
          {(pricing.product_taxes || []).map((tax) => (
            <Row key={tax.name} label={<>{tax.name} <span className="text-xs">({rule(tax.type, tax.value)})</span></>} value={money(tax.amount)} />
          ))}
          <Row label={<>Category tax <span className="text-xs">({rule(category?.tax_type, category?.tax_value, category?.tax_name)})</span></>} value={money(pricing.category_tax_amount)} />
          {Number(pricing.sales_tax_amount) > 0 ? <Row label={`Sales tax (${pricing.sales_tax_rate}%)`} value={money(pricing.sales_tax_amount)} /> : null}
          <Row label="Customer pays" value={money(pricing.price_with_tax)} strong />
          {pricing.taxes_charged === false ? <p className="mt-1 text-xs text-amber-700">Taxes are switched off for this store, so none are added.</p> : null}
          <div className="mt-2 border-t border-slate-100 pt-2">
            <Row label="Cost price" value={money(pricing.cost_price)} />
            <Row label="Profit / unit" value={money(pricing.profit_per_unit)} />
            <Row label="Margin" value={`${pricing.margin_percent ?? 0}%`} />
          </div>
        </Card>

        <Card title={scope.isAll || !scope.isAdmin ? "Stock" : `Stock · ${scope.label}`} description={scope.isAdmin ? "Every location, or the one picked in the top bar." : "Your location only."}>
          <StockTable stocks={stocks} isPack={product.is_pack_product} />
          <div className="mt-3 border-t border-slate-100 pt-2">
            <Row label="Total quantity" value={stock.total_qty} strong />
            <Row label="Units sold" value={stock.unit_sold} />
            <Row label="Stock value at cost" value={money(stock.cost_value)} />
            <Row label="Stock value at selling price" value={money(stock.selling_value)} />
          </div>
        </Card>

        <Card title="Taxes" description="Set on the product. The category tax and the store's sales tax are added at checkout.">
          {taxes.length ? (
            taxes.map((tax, index) => (
              <Row key={`${tax.name}-${index}`} label={tax.name || `Tax ${index + 1}`} value={tax.type === "percentage" ? `${Number(tax.value)}%` : <><Currency value={tax.value} /> / unit</>} />
            ))
          ) : (
            <p className="text-sm text-slate-500">No product tax.</p>
          )}
          <div className="mt-2 border-t border-slate-100 pt-2">
            <Row label="Category tax" value={rule(category?.tax_type, category?.tax_value, category?.tax_name)} />
            <Row label="Sales tax" value={pricing.sales_tax_rate ? `${pricing.sales_tax_rate}%` : "Off"} />
          </div>
        </Card>

        <Card title="Pack">
          <Row label="Pack product" value={yesNo(product.is_pack_product)} />
          {product.is_pack_product ? (
            <>
              <Row label="Pack size" value={stock.pack_size ?? product.pack_size} />
              <Row label="Pack cost price" value={money(product.pack_cost_price)} />
              <Row label="Pack selling price" value={money(product.pack_selling_price)} />
              <Row label="Cost price / unit" value={money(pricing.cost_price)} />
              <Row label="Selling price / unit" value={money(pricing.selling_price)} />
              <Row label="Full packs in stock" value={stock.number_of_packs} />
              <Row label="Units in full packs" value={stock.units_in_full_packs} />
              <Row label="Loose units" value={stock.loose_units} />
              <Row label="Full packs value at cost" value={money(stock.full_packs_cost_value)} />
              <Row label="Full packs value at selling price" value={money(stock.full_packs_selling_value)} />
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Sold by the unit, not in packs.</p>
          )}
        </Card>
      </div>

      {product.description ? (
        <Card title="Description">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{product.description}</p>
        </Card>
      ) : null}

    </div>
  )
}
