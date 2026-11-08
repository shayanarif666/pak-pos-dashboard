import { Fragment, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ChevronDown, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react"
import { useDeleteVariant, useProductQuery } from "../../features/catalog/catalogQuery.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { formatDate } from "../../ui/format.js"
import { unitShort, withUnit } from "../../ui/units.js"
import { ColorSwatches } from "../../features/catalog/ColorsField.jsx"

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
const wholeNumber = (value) => (value == null || value === "" ? "—" : String(Math.round(Number(value))))

/** A labelled identifier (SKU, Barcode) shown as a block, not as part of a sentence. */
function IdTag({ label, value }) {
  return (
    <div className="min-w-[9rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="break-all font-mono text-sm font-semibold text-slate-950">{value || "—"}</p>
    </div>
  )
}

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

const EXPIRY_TONE = { expired: "rose", critical: "rose", warning: "amber", ok: "emerald" }
const EXPIRY_LABEL = { expired: "Expired", critical: "Expires soon", warning: "Expiring", ok: "Fresh" }
const SOURCE_LABEL = { opening: "Opening stock", purchase: "Purchase", stock_in: "Stock in", adjustment: "Adjustment", refund: "Refund", transfer: "Transfer" }

/** "in 12 days" / "today" / "3 days ago". */
function daysText(days) {
  if (days == null) return ""
  if (days === 0) return "today"
  return days > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : `${-days} day${days === -1 ? "" : "s"} ago`
}

/** Units as "3 packs + 2" for a pack product. */
function packsText(qty, packSize) {
  const size = Number(packSize || 0)
  if (size < 2) return null
  const packs = Math.floor(Number(qty) / size)
  const loose = Math.round((Number(qty) - packs * size) * 1000) / 1000
  return `${packs} pack${packs === 1 ? "" : "s"}${loose ? ` + ${loose}` : ""}`
}

/** The lots of one location's stock, soonest expiry first. */
function LotsTable({ lots, packSize, unit }) {
  if (!lots.length) return <p className="px-5 py-3 text-xs text-slate-500">No lots in stock.</p>
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-[11px] uppercase tracking-[0.1em] text-slate-400">
        <tr>
          <th className="py-2 pl-12 pr-3 font-semibold">Lot #</th>
          <th className="px-3 py-2 text-right font-semibold">Qty</th>
          <th className="px-3 py-2 font-semibold">Expiry</th>
          <th className="px-3 py-2 font-semibold">Status</th>
          <th className="px-3 py-2 font-semibold">Received</th>
          <th className="px-5 py-2 font-semibold">Source</th>
        </tr>
      </thead>
      <tbody>
        {lots.map((lot) => (
          <tr key={lot.id} className="border-t border-slate-100">
            <td className="py-2 pl-12 pr-3 font-medium text-slate-900">Lot {lot.id}</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {withUnit(lot.qty, unit)}
              {packsText(lot.qty, packSize) ? <span className="block text-[11px] text-slate-400">{packsText(lot.qty, packSize)}</span> : null}
            </td>
            <td className="px-3 py-2">
              {lot.expiry_date ? (
                <>
                  {formatDate(lot.expiry_date)}
                  <span className="block text-[11px] text-slate-400">{daysText(lot.days_left)}</span>
                </>
              ) : (
                <span className="text-slate-400">No expiry</span>
              )}
            </td>
            <td className="px-3 py-2">{lot.expiry_status ? <Pill tone={EXPIRY_TONE[lot.expiry_status] || "zinc"}>{EXPIRY_LABEL[lot.expiry_status] || lot.expiry_status}</Pill> : "—"}</td>
            <td className="px-3 py-2">{lot.received_at ? formatDate(lot.received_at) : "—"}</td>
            <td className="px-5 py-2 text-slate-600">{SOURCE_LABEL[lot.source] || lot.source || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Stock per location of one product or variant; each row opens to its lots. */
function StockTable({ stocks, isPack, packSize, unit }) {
  const [open, setOpen] = useState(() => new Set())
  if (!stocks.length) return <p className="text-sm text-slate-500">No stock recorded yet.</p>
  const toggle = (key) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const columns = isPack ? 8 : 7
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="ui-table w-full min-w-[560px] text-left text-sm">
        <thead className="border-y border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="w-8 py-2.5 pl-5" aria-label="Lots" />
            <th className="px-3 py-2.5 font-semibold">Location</th>
            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
            {isPack ? <th className="px-3 py-2.5 text-right font-semibold">Packs</th> : null}
            <th className="px-3 py-2.5 text-right font-semibold">Sold</th>
            <th className="px-3 py-2.5 text-right font-semibold">Low at</th>
            <th className="px-3 py-2.5 font-semibold">Lots · soonest expiry</th>
            <th className="px-5 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((row) => {
            const key = row.id || row.location_id
            const lots = row.lots || []
            const isOpen = open.has(key)
            const loose = isPack ? Math.round((Number(row.qty) - Number(row.number_of_packs || 0) * Number(packSize || 0)) * 1000) / 1000 : 0
            return (
              <Fragment key={key}>
                <tr className={`border-b border-slate-100 ${lots.length ? "cursor-pointer hover:bg-slate-50" : ""}`} onClick={lots.length ? () => toggle(key) : undefined}>
                  <td className="py-2.5 pl-5 text-slate-400">
                    {lots.length ? (
                      <button type="button" aria-label={isOpen ? "Hide lots" : "Show lots"} aria-expanded={isOpen} onClick={(event) => { event.stopPropagation(); toggle(key) }}>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-950">{row.location_name || `Location #${row.location_number}`}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{withUnit(row.qty, unit)}</td>
                  {isPack ? (
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.number_of_packs ?? "—"}
                      {loose ? <span className="block text-xs text-slate-400">+ {withUnit(loose, unit)} loose</span> : null}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.unit_sold}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.effective_threshold ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{lots.length} lot{lots.length === 1 ? "" : "s"}</span>
                    <span className="block text-xs text-slate-500">{row.expiry_date ? `Soonest ${formatDate(row.expiry_date)}` : "No expiry"}</span>
                  </td>
                  <td className="px-5 py-2.5"><Pill tone={Number(row.qty) <= 0 ? "rose" : row.is_low ? "amber" : "emerald"}>{Number(row.qty) <= 0 ? "Out" : row.is_low ? "Low" : "OK"}</Pill></td>
                </tr>
                {isOpen ? (
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <td colSpan={columns} className="p-0">
                      <LotsTable lots={lots} packSize={isPack ? packSize : null} unit={unit} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
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
function VariantCard({ variant, fallbackImage, unit, onDelete, deleting = false }) {
  const stocks = variant.stocks || []
  const qty = Number(variant.total_qty ?? stocks.reduce((sum, row) => sum + Number(row.qty || 0), 0))
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {variant.image || fallbackImage ? (
            <a href={variant.image || fallbackImage} target="_blank" rel="noreferrer" className="relative shrink-0">
              <img src={variant.image || fallbackImage} alt="" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
              {variant.image ? null : <span className="absolute inset-x-0 bottom-0 rounded-b-xl bg-slate-900/60 text-center text-[10px] text-white">Product</span>}
            </a>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[10px] text-slate-400">No image</div>
          )}
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            <span className="mr-2 text-xs font-normal text-slate-400">#{variant.variant_number}</span>
            {variant.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <IdTag label="SKU" value={variant.sku} />
            <IdTag label="Barcode" value={variant.barcode} />
          </div>
          <Link
            to={`/products/${variant.id}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            <Eye className="h-3.5 w-3.5" />
            View variant detail
          </Link>
          {onDelete ? (
            <button
              type="button"
              disabled={deleting}
              onClick={() => onDelete(variant)}
              className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete variant
            </button>
          ) : null}
        </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={variant.is_pack_product ? "sky" : "zinc"}>{variant.is_pack_product ? `Pack of ${variant.pack_size}` : "Loose"}</Pill>
          {variant.is_weight_based ? <Pill tone="amber">By weight (kg)</Pill> : null}
          <Pill tone={variant.is_active === false ? "rose" : "emerald"}>{variant.is_active === false ? "Disabled" : "Active"}</Pill>
          <Pill tone={variant.stock_status === "out" ? "rose" : variant.stock_status === "low" ? "amber" : "emerald"}>{withUnit(qty, unit)} in stock</Pill>
        </div>
      </div>
      <div className="mt-3 grid gap-x-8 md:grid-cols-2">
        <div>
          {variant.is_pack_product ? (
            <>
              <Row label="Pack size" value={withUnit(variant.pack_size, unit)} />
              <Row label={`Pack cost (${withUnit(variant.pack_size, unit)})`} value={money(variant.pack_cost_price)} />
              <Row label={`Pack price (${withUnit(variant.pack_size, unit)})`} value={money(variant.pack_selling_price)} />
              <Row label="Single units sold too" value={yesNo(variant.sell_loose)} />
            </>
          ) : null}
          <Row label={`Cost / ${unitShort(unit)}`} value={money(variant.cost_price)} />
          <Row label={`Price / ${unitShort(unit)}`} value={money(variant.selling_price)} strong />
        </div>
        <div>
          <Row label="Colors" value={<ColorSwatches colors={variant.colors} />} />
          <Row label="Own taxes" value={taxList(variant.variant_taxes)} />
          <Row label="Product + own taxes" value={taxList(variant.taxes)} />
          <Row label="Taxes page taxes" value={taxList(variant.store_taxes)} />
          <Row label="Stock value at cost" value={money(qty * Number(variant.cost_price || 0))} />
          <Row label="Stock value at price" value={money(qty * Number(variant.selling_price || 0))} />
        </div>
      </div>
      <div className="mt-3">
        <StockTable stocks={stocks} isPack={variant.is_pack_product} packSize={variant.pack_size} unit={unit} />
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
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const removeVariant = useDeleteVariant()

  /**
   * Soft delete of a variant: it leaves this product, the forms, the stock lists and the POS; its
   * stock, movements and sales stay. parentId = its product (the variant's own page goes back there).
   */
  async function deleteVariant(variant, parentId, { goBack = false } = {}) {
    const ok = await confirmToast({
      title: `Delete variant "${variant.name || variant.variant_name || variant.title}"?`,
      message: "It is hidden from the product, the add / edit forms, the stock lists and the POS. Its stock, stock movements and orders stay as they are.",
      confirmLabel: "Delete variant",
    })
    if (!ok) return
    try {
      await removeVariant.mutateAsync({ productId: parentId, variantId: variant.id })
      toast("Variant deleted")
      if (goBack) navigate(`/products/${parentId}`, { replace: true })
    } catch (err) {
      toast(err.message, "error")
    }
  }

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
            {product.product_number != null || product.variant_number != null ? (
              <p className="mt-1 text-sm text-slate-500">{product.product_number != null ? `Product #${product.product_number}` : `Variant #${product.variant_number}`}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <IdTag label="SKU" value={product.sku} />
              <IdTag label="Barcode" value={product.barcode} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={product.is_active ? "emerald" : "rose"}>{product.is_active ? "Active" : "Disabled"}</Pill>
              <Pill tone={product.is_published ? "sky" : "zinc"}>{product.is_published ? "Published" : "Draft"}</Pill>
              <Pill tone={product.is_pos_visible ? "sky" : "zinc"}>POS</Pill>
              <Pill tone={product.is_web_visible ? "fuchsia" : "zinc"}>Web</Pill>
            </div>
          </div>
        </div>
        {/* A variant is edited inside its product, not on its own. */}
        {product.parent_product_id ? (
          // A variant's own page: no Edit (it is edited in its product), but it can be deleted.
          <Button variant="ghost" disabled={removeVariant.isPending} onClick={() => deleteVariant(product, product.parent_product_id, { goBack: true })}>
            <Trash2 className="h-4 w-4 text-rose-600" />
            <span className="text-rose-700">Delete variant</span>
          </Button>
        ) : (
          <Link to={`/products/${product.id}/edit`}>
            <Button>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </div>
    </>
  )

  // A product with variants: the product groups them; prices, pack and stock are each variant's.
  if (product.has_variants) {
    const variants = product.variants || []
    return (
      <div className="space-y-6">
        {header}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Details">
            <Row
              label="Category"
              value={category ? <Link to={`/categories/${category.category_number ?? category.id}`} className="font-medium underline-offset-2 hover:underline">{category.name}</Link> : "—"}
            />
            <Row label="Sold at" value={<LocationScopePills row={product} />} />
            <Row label="Stock held at" value={stockHeldAt(product)} />
            <Row label="Unit" value={product.unit} />
            <Row label="Default low stock" value={wholeNumber(product.low_stock_threshold)} />
            <Row label="Created" value={formatDate(product.created_at)} />
            <Row label="Updated" value={formatDate(product.updated_at)} />
          </Card>
          <Card title="Taxes and discount" description="The product's taxes apply to every variant; a variant may add its own. Taxes page taxes are added at checkout.">
            <Row label="Product taxes" value={taxList(taxes)} />
            <Row label="Taxes page taxes" value={taxList(product.store_taxes)} />
            <Row label="Product discount" value={rule(product.discount_type, product.discount_value, product.discount_name)} />
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Row label="Category tax" value={rule(category?.tax_type, category?.tax_value, category?.tax_name)} />
              <Row label="Category discount" value={rule(category?.discount_type, category?.discount_value, category?.discount_name)} />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-950">
            Variants{scope.isAdmin && !scope.isAll ? <span className="ml-2 text-sm font-normal text-slate-500">stock at {scope.label}</span> : null}
          </h2>
          {variants.map((variant) => <VariantCard
              key={variant.id}
              variant={variant}
              fallbackImage={featured}
              unit={product.unit}
              deleting={removeVariant.isPending}
              onDelete={(row) => deleteVariant(row, product.id)}
            />)}
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
          <Row label="Unit" value={product.unit} />
          <Row label="Weight based" value={yesNo(product.is_weight_based)} />
          <Row label="Colors" value={<ColorSwatches colors={product.colors} />} />
          <Row label="Sell loose" value={yesNo(product.sell_loose)} />
          <Row label="Default low stock" value={wholeNumber(product.low_stock_threshold)} />
          <Row label="Created" value={formatDate(product.created_at)} />
          <Row label="Updated" value={formatDate(product.updated_at)} />
        </Card>
        <Card title="Taxes" description="Every tax a sale of this product charges, and where it is set.">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">On the product</p>
          {taxes.length ? (
            taxes.map((tax, index) => <Row key={`${tax.name}-${index}`} label={tax.name || `Tax ${index + 1}`} value={rule(tax.type, tax.value)} />)
          ) : (
            <p className="py-1.5 text-sm text-slate-500">None</p>
          )}
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Taxes page</p>
          {(product.store_taxes || []).length ? (
            product.store_taxes.map((tax) => <Row key={tax.id ?? tax.name} label={tax.name} value={rule(tax.type, tax.value)} />)
          ) : (
            <p className="py-1.5 text-sm text-slate-500">None apply to this product</p>
          )}
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Category</p>
          <Row label={category?.name || "Category"} value={category?.tax_type ? rule(category.tax_type, category.tax_value, category.tax_name) : "None"} />
          <div className="mt-2 border-t border-slate-100 pt-2">
            <Row label="Tax on one unit" value={money(pricing.tax_amount)} strong />
          </div>
        </Card>
      </div>

      <div className={`grid gap-4 ${product.is_pack_product ? "lg:grid-cols-2" : ""}`}>
        <Card title="Price of one unit" description="As a sale charges it: the product discount, then the category discount on the rest, then the taxes on that.">
          <Row label="Selling price" value={money(pricing.selling_price)} />
          {Number(pricing.product_discount_amount) > 0 ? (
            <Row label={<>Product discount <span className="text-xs">({rule(product.discount_type, product.discount_value, product.discount_name)})</span></>} value={<>−{money(pricing.product_discount_amount)}</>} />
          ) : null}
          <Row label={<>Category discount <span className="text-xs">({rule(category?.discount_type, category?.discount_value, category?.discount_name)})</span></>} value={<>−{money(pricing.category_discount_amount)}</>} />
          <Row label="Price after discounts" value={money(pricing.price_after_discount)} strong />
          {[...(pricing.product_taxes || []), ...(pricing.store_taxes || [])].map((tax, index) => (
            <Row key={`${tax.name}-${index}`} label={<>{tax.name} <span className="text-xs">({rule(tax.type, tax.value)})</span></>} value={money(tax.amount)} />
          ))}
          {category?.tax_type ? (
            <Row label={<>Category tax <span className="text-xs">({rule(category.tax_type, category.tax_value, category.tax_name)})</span></>} value={money(pricing.category_tax_amount)} />
          ) : null}
          {Number(pricing.sales_tax_amount) > 0 ? <Row label={`Sales tax (${pricing.sales_tax_rate}%)`} value={money(pricing.sales_tax_amount)} /> : null}
          {Number(pricing.tax_amount) > 0 ? null : <Row label="Taxes" value="None" />}
          <Row label="Customer pays" value={money(pricing.price_with_tax)} strong />
          {pricing.taxes_charged === false ? <p className="mt-1 text-xs text-amber-700">Taxes are switched off for this store, so none are added.</p> : null}
          <div className="mt-2 border-t border-slate-100 pt-2">
            <Row label="Cost price" value={money(pricing.cost_price)} />
            <Row label="Profit / unit" value={money(pricing.profit_per_unit)} />
            <Row label="Margin" value={`${pricing.margin_percent ?? 0}%`} />
          </div>
        </Card>
        {product.is_pack_product ? (
        <Card title="Pack">
          <>
              <Row label="Pack size" value={withUnit(stock.pack_size ?? product.pack_size, product.unit)} />
              <Row label={`Pack cost price (${withUnit(stock.pack_size ?? product.pack_size, product.unit)})`} value={money(product.pack_cost_price)} />
              <Row label={`Pack selling price (${withUnit(stock.pack_size ?? product.pack_size, product.unit)})`} value={money(product.pack_selling_price)} />
              <Row label={`Cost price / ${unitShort(product.unit)}`} value={money(pricing.cost_price)} />
              <Row label={`Selling price / ${unitShort(product.unit)}`} value={money(pricing.selling_price)} />
              <Row label="Full packs in stock" value={stock.number_of_packs} />
              <Row label="In full packs" value={withUnit(stock.units_in_full_packs ?? 0, product.unit)} />
              <Row label="Loose" value={withUnit(stock.loose_units ?? 0, product.unit)} />
              <Row label="Full packs value at cost" value={money(stock.full_packs_cost_value)} />
              <Row label="Full packs value at selling price" value={money(stock.full_packs_selling_value)} />
          </>
        </Card>
        ) : null}
      </div>

        <Card title={scope.isAll || !scope.isAdmin ? "Stock" : `Stock · ${scope.label}`} description={scope.isAdmin ? "Every location, or the one picked in the top bar." : "Your location only."}>
          <StockTable stocks={stocks} isPack={product.is_pack_product} packSize={product.pack_size} unit={product.unit} />
          <div className="mt-3 border-t border-slate-100 pt-2">
            <Row label="Total quantity" value={withUnit(stock.total_qty ?? 0, product.unit)} strong />
            <Row label="Sold" value={withUnit(stock.unit_sold ?? 0, product.unit)} />
            <Row label="Stock value at cost" value={money(stock.cost_value)} />
            <Row label="Stock value at selling price" value={money(stock.selling_value)} />
          </div>
        </Card>

      {product.description ? (
        <Card title="Description">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{product.description}</p>
        </Card>
      ) : null}

    </div>
  )
}
