import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ImagePlus, Plus, Trash2, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useCategoriesQuery,
  useLocationsQuery,
  useProductQuery,
  useSaveProduct,
} from "../../features/catalog/catalogQuery.jsx"
import { resolveDashboardLocation } from "../../features/catalog/dashboardLocation.js"
import { LocationScopeField } from "../../features/scope/LocationScopeField.jsx"
import { generateBarcode } from "../../features/catalog/barcode.js"
import {
  PRODUCT_UNITS,
  emptyOpeningStock,
  emptyProductForm,
  emptyTax,
  emptyVariant,
  productFormError,
  productPayload,
  productToForm,
} from "../../features/catalog/productForm.js"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"

/** Barcode input with a Generate button (a new 13-digit barcode). */
function BarcodeField({ label, required, value, onChange }) {
  return (
    <div className="flex items-end gap-2">
      <Input label={label} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Scan, type or generate" className="min-w-0 flex-1" />
      <Button variant="ghost" type="button" className="h-11 shrink-0" onClick={() => onChange(generateBarcode())}>
        Generate
      </Button>
    </div>
  )
}

function Section({ title, description, children, actions = null }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

/** Add and edit a product: one form (/products/new and /products/:id/edit). */
export function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const auth = useAuth()
  const isAdmin = auth.user?.role === "store_admin"
  const ownLocation = resolveDashboardLocation(auth)
  const { toast } = useToast()
  const saveProduct = useSaveProduct()
  const categoriesQuery = useCategoriesQuery()
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const productQuery = useProductQuery(id, {}, { enabled: isEdit })
  const product = productQuery.data

  const [form, setForm] = useState(emptyProductForm)
  const [stock, setStock] = useState({})
  const [initialStock, setInitialStock] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState("")

  const categories = categoriesQuery.data || []
  const allLocations = useMemo(() => locationsQuery.data || [], [locationsQuery.data])
  const activeLocations = allLocations.filter((row) => row.is_active !== false)
  // Stock rows: the store admin sets every location the product is sold at; a manager their own.
  const stockLocations = isAdmin
    ? form.location_scope === "selected"
      ? activeLocations.filter((row) => form.location_ids.includes(row.id))
      : activeLocations
    : ownLocation
      ? [ownLocation]
      : []
  const selectedCategory = categories.find((row) => row.id === form.category_id)
  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile])
  useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview])
  const currentImage = removeImage ? "" : imagePreview || product?.featured_image || ""

  useEffect(() => {
    if (!product) return
    setForm(productToForm(product))
    const rows = Object.fromEntries(
      (product.stocks || []).map((row) => [
        row.location_id,
        { qty: row.qty == null ? "" : String(Number(row.qty)), expiry_date: row.expiry_date ? String(row.expiry_date).slice(0, 10) : "" },
      ])
    )
    setStock(rows)
    setInitialStock(rows)
  }, [product])

  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const patchVariant = (index, key, value) =>
    setForm((current) => ({ ...current, variants: current.variants.map((row, i) => (i === index ? { ...row, [key]: value } : row)) }))
  const hasVariants = form.variants.length > 0
  const patchVariantTax = (index, t, key, value) =>
    setForm((current) => ({
      ...current,
      variants: current.variants.map((row, i) =>
        i === index ? { ...row, taxes: row.taxes.map((tax, j) => (j === t ? { ...tax, [key]: value } : tax)) } : row
      ),
    }))
  const patchTax = (index, key, value) =>
    setForm((current) => ({ ...current, taxes: current.taxes.map((tax, i) => (i === index ? { ...tax, [key]: value } : tax)) }))
  const patchStock = (locationId, key, value) =>
    setStock((current) => ({ ...current, [locationId]: { ...(current[locationId] || emptyOpeningStock()), [key]: value } }))

  function stockPayloads() {
    const threshold = form.low_stock_threshold === "" ? null : Number(form.low_stock_threshold)
    return stockLocations
      .map((location) => {
        const row = stock[location.id] || emptyOpeningStock()
        const before = initialStock[location.id] || emptyOpeningStock()
        // Create: only what was filled in. Edit: only what changed.
        const changed = isEdit ? row.qty !== before.qty || row.expiry_date !== before.expiry_date : row.qty !== "" || row.expiry_date
        if (!changed) return null
        return {
          location_id: location.id,
          qty: Number(row.qty || 0),
          expiry_date: row.expiry_date || null,
          low_stock_threshold: threshold,
          reason: isEdit ? "count" : "opening_balance",
        }
      })
      .filter(Boolean)
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    const problem = productFormError(form)
    if (problem) return setError(problem)
    if (isAdmin && form.location_scope === "selected" && !form.location_ids.length) {
      return setError("Pick at least one location the product is sold at, or choose All locations.")
    }
    try {
      const json = await saveProduct.mutateAsync({
        id: isEdit ? id : undefined,
        body: productPayload(form, { withScope: isAdmin }),
        imageFile,
        removeImage: removeImage && !imageFile,
        stockPayloads: hasVariants ? [] : stockPayloads(),
      })
      toast(isEdit ? "Product updated" : "Product created")
      // A barcode already in use was swapped for a new one by the API.
      if (json.data?.barcode_replaced) {
        toast(`Barcode ${json.data.barcode_replaced.requested} was already in use — saved as ${json.data.barcode_replaced.used}`, "error")
      }
      navigate(`/products/${json.productId}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (categoriesQuery.isPending || (isAdmin && locationsQuery.isPending) || (isEdit && productQuery.isPending)) {
    return <PageLoader label={isEdit ? "Loading product…" : "Loading form…"} />
  }
  const loadError = categoriesQuery.error?.message || locationsQuery.error?.message || productQuery.error?.message

  return (
    <section className="space-y-6">
      <Link to={isEdit ? `/products/${id}` : "/products"} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        {isEdit ? "Back to product" : "Back to products"}
      </Link>
      <PageHeader
        section="Catalog"
        title={isEdit ? `Edit ${product?.title || "product"}` : "New product"}
        description={isEdit ? `#${product?.product_number} · SKU ${product?.sku}` : "The SKU is made from the title when you save."}
      />
      {loadError ? <p className="text-sm text-rose-700">{loadError}</p> : null}

      <form onSubmit={save} className="space-y-6">
        <Section title="Product" description="What it is and where it belongs.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Title" required value={form.title} onChange={(e) => patch("title", e.target.value)} placeholder="1 Litre Pepsi" />
            <BarcodeField
              label={hasVariants ? "Barcode (optional with variants)" : "Barcode"}
              required={!hasVariants}
              value={form.barcode}
              onChange={(value) => patch("barcode", value)}
            />
            <Select label="Category" required value={form.category_id} onChange={(e) => patch("category_id", e.target.value)}>
              <option value="">Select category</option>
              {categories.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </Select>
            <Select label="Unit" value={form.unit} onChange={(e) => patch("unit", e.target.value)}>
              {PRODUCT_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </Select>
            <Textarea label="Description" className="md:col-span-2" value={form.description} onChange={(e) => patch("description", e.target.value)} />
          </div>
          {selectedCategory?.tax_type || selectedCategory?.discount_type ? (
            <p className="mt-3 text-xs text-slate-500">
              {selectedCategory.name} adds its own
              {selectedCategory.discount_type ? ` discount (${selectedCategory.discount_value}${selectedCategory.discount_type === "percentage" ? "%" : " Rs"})` : ""}
              {selectedCategory.discount_type && selectedCategory.tax_type ? " and" : ""}
              {selectedCategory.tax_type ? ` tax (${selectedCategory.tax_value}${selectedCategory.tax_type === "percentage" ? "%" : " Rs"})` : ""} at checkout.
            </p>
          ) : null}
        </Section>

        <Section
          title="Variants"
          description="Sizes, colours… Each variant is sold on its own with its own SKU, barcode, prices and stock; this product groups them and is not sold itself."
          actions={
            <Button variant="ghost" type="button" onClick={() => patch("variants", [...form.variants, emptyVariant()])}>
              <Plus className="h-4 w-4" /> Add variant
            </Button>
          }
        >
          {hasVariants ? (
            <div className="space-y-4">
              {form.variants.map((row, index) => (
                <div key={row.id || `new-${index}`} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{row.name || `Variant ${index + 1}`}{row.id ? <span className="ml-2 text-xs font-normal text-slate-400">saved</span> : null}</p>
                    <div className="flex items-center gap-2">
                      {row.id ? <Link to={`/products/${row.id}`} className="text-sm font-medium text-brand-700 hover:underline">Stock & detail →</Link> : null}
                      {row.id ? null : (
                        <Button variant="icon" type="button" aria-label="Remove variant" onClick={() => patch("variants", form.variants.filter((_, i) => i !== index))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Input label="Name" required value={row.name} onChange={(e) => patchVariant(index, "name", e.target.value)} placeholder="1.5L" />
                    <Input label="SKU" value={row.sku} onChange={(e) => patchVariant(index, "sku", e.target.value)} placeholder="Auto" />
                    <div className="md:col-span-2">
                      <BarcodeField label="Barcode" required value={row.barcode} onChange={(value) => patchVariant(index, "barcode", value)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                      {[
                        { value: false, label: "Loose" },
                        { value: true, label: "Pack" },
                      ].map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => patchVariant(index, "is_pack_product", option.value)}
                          className={["rounded-lg px-3 py-1.5 text-sm font-semibold transition", row.is_pack_product === option.value ? "bg-brand-700 text-white" : "text-slate-600 hover:text-brand-700"].join(" ")}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {row.is_pack_product ? (
                      <Checkbox label="Also sold as single units" checked={row.sell_loose} onChange={(e) => patchVariant(index, "sell_loose", e.target.checked)} />
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {row.is_pack_product ? (
                      <>
                        <Input label="Pack size" type="number" min="2" step="1" required value={row.pack_size} onChange={(e) => patchVariant(index, "pack_size", e.target.value)} />
                        <Input label="Pack cost" type="number" min="0" step="0.01" required value={row.pack_cost} onChange={(e) => patchVariant(index, "pack_cost", e.target.value)} />
                        <Input label="Pack price" type="number" min="0" step="0.01" required value={row.pack_price} onChange={(e) => patchVariant(index, "pack_price", e.target.value)} />
                      </>
                    ) : (
                      <>
                        <Input label="Cost (one unit)" type="number" min="0" step="0.01" required value={row.cost} onChange={(e) => patchVariant(index, "cost", e.target.value)} />
                        <Input label="Price (one unit)" type="number" min="0" step="0.01" required value={row.price} onChange={(e) => patchVariant(index, "price", e.target.value)} />
                      </>
                    )}
                    {row.id ? null : (
                      <Input label="Opening stock" type="number" min="0" step="1" value={row.stock} onChange={(e) => patchVariant(index, "stock", e.target.value)} />
                    )}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-slate-600">Taxes on this variant only (the product's taxes apply too)</p>
                      <button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => patchVariant(index, "taxes", [...row.taxes, emptyTax()])}>
                        + Add tax
                      </button>
                    </div>
                    {row.taxes.map((tax, t) => (
                      <div key={t} className="mb-2 grid items-end gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <Input label="Name" value={tax.name} onChange={(e) => patchVariantTax(index, t, "name", e.target.value)} />
                        <Select label="Type" value={tax.type} onChange={(e) => patchVariantTax(index, t, "type", e.target.value)}>
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed (Rs per unit)</option>
                        </Select>
                        <Input label="Value" type="number" min="0" step="0.01" required value={tax.value} onChange={(e) => patchVariantTax(index, t, "value", e.target.value)} />
                        <Button variant="icon" type="button" aria-label="Remove tax" onClick={() => patchVariant(index, "taxes", row.taxes.filter((_, j) => j !== t))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                A new variant's opening stock goes to {isAdmin ? "the store's default location" : ownLocation?.name || "your location"}; change stock later on the variant's page. A barcode already used by another product is replaced with a new one when you save.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No variants. Add them when this product comes in sizes or colours.</p>
          )}
        </Section>

        {hasVariants ? null : (
        <Section title="Price" description="A loose item is priced per unit; a pack product by the whole pack (the unit price is pack price ÷ pack size).">
          <div className="mb-4 inline-flex rounded-xl border border-slate-200 p-1">
            {[
              { value: false, label: "Loose item" },
              { value: true, label: "Pack product" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => patch("is_pack_product", option.value)}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-semibold transition",
                  form.is_pack_product === option.value ? "bg-brand-700 text-white" : "text-slate-600 hover:text-brand-700",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
          {form.is_pack_product ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Pack size (units per pack)" type="number" min="2" step="1" required value={form.pack_size} onChange={(e) => patch("pack_size", e.target.value)} />
              <Input label="Pack cost" type="number" min="0" step="0.01" required value={form.pack_cost} onChange={(e) => patch("pack_cost", e.target.value)} />
              <Input label="Pack price" type="number" min="0" step="0.01" required value={form.pack_price} onChange={(e) => patch("pack_price", e.target.value)} />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Cost (one unit)" type="number" min="0" step="0.01" required value={form.cost} onChange={(e) => patch("cost", e.target.value)} />
              <Input label="Selling price (one unit)" type="number" min="0" step="0.01" required value={form.price} onChange={(e) => patch("price", e.target.value)} />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {form.is_pack_product ? (
              <Checkbox label="Also sold as single units" checked={form.sell_loose} onChange={(e) => patch("sell_loose", e.target.checked)} />
            ) : null}
            <Checkbox label="Sold by weight (kg)" checked={form.is_weight_based} onChange={(e) => patch("is_weight_based", e.target.checked)} />
          </div>
        </Section>
        )}

        <Section
          title="Taxes"
          description="Every tax on this product (GST, excise, import duty…). The category tax and the store's sales tax are added at checkout."
          actions={
            <Button variant="ghost" type="button" onClick={() => patch("taxes", [...form.taxes, emptyTax()])}>
              <Plus className="h-4 w-4" /> Add tax
            </Button>
          }
        >
          {form.taxes.length ? (
            <div className="space-y-3">
              {form.taxes.map((tax, index) => (
                <div key={index} className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Input label="Name" value={tax.name} onChange={(e) => patchTax(index, "name", e.target.value)} placeholder="GST" />
                  <Select label="Type" value={tax.type} onChange={(e) => patchTax(index, "type", e.target.value)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (Rs per unit)</option>
                  </Select>
                  <Input label={tax.type === "percentage" ? "Rate %" : "Amount Rs"} type="number" min="0" step="0.01" required value={tax.value} onChange={(e) => patchTax(index, "value", e.target.value)} />
                  <Button variant="icon" type="button" aria-label="Remove tax" onClick={() => patch("taxes", form.taxes.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No product tax. Add one if this product carries GST or another tax.</p>
          )}
        </Section>

        <Section title="Image" description="One image per product. A new one replaces the old.">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {currentImage ? <img src={currentImage} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-8 w-8 text-slate-300" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                <ImagePlus className="h-4 w-4" />
                {currentImage ? "Change image" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setImageFile(file)
                      setRemoveImage(false)
                    }
                    e.target.value = ""
                  }}
                />
              </label>
              {currentImage ? (
                <Button variant="ghost" type="button" onClick={() => { setImageFile(null); setRemoveImage(Boolean(product?.featured_image)) }}>
                  <X className="h-4 w-4" /> Remove
                </Button>
              ) : null}
            </div>
          </div>
        </Section>

        <Section title="Availability" description="Where and how it is sold.">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Checkbox label="Active (on sale)" checked={form.is_active} onChange={(e) => patch("is_active", e.target.checked)} />
            <Checkbox label="Shown on the POS" checked={form.is_pos_visible} onChange={(e) => patch("is_pos_visible", e.target.checked)} />
            <Checkbox label="Shown on the website" checked={form.is_web_visible} onChange={(e) => patch("is_web_visible", e.target.checked)} />
            <Checkbox label="Published on the website" checked={form.is_published} onChange={(e) => patch("is_published", e.target.checked)} />
          </div>
          {isAdmin ? (
            <div className="mt-5">
              <LocationScopeField
                title="Sold at"
                value={form}
                locations={activeLocations}
                onChange={(next) => setForm((current) => ({ ...current, location_scope: next.location_scope, location_ids: next.location_ids }))}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Sold at {ownLocation?.name || "your location"}.</p>
          )}
        </Section>

        {hasVariants ? null : (
        <Section
          title={isEdit ? "Stock" : "Opening stock"}
          description={isEdit ? "Change a quantity to set the counted stock there. Untouched rows stay as they are." : "Quantity at each location it is sold at. Empty = 0."}
        >
          <div className="mb-4 max-w-xs">
            <Input label="Low stock alert at" type="number" min="0" step="1" value={form.low_stock_threshold} onChange={(e) => patch("low_stock_threshold", e.target.value)} />
          </div>
          {stockLocations.length ? (
            <div className="space-y-3">
              {stockLocations.map((location) => {
                const row = stock[location.id] || emptyOpeningStock()
                return (
                  <div key={location.id} className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[minmax(0,1.2fr)_1fr_1fr]">
                    <div className="pb-2.5">
                      <p className="text-sm font-semibold text-slate-900">{location.name}</p>
                      {location.is_default ? <p className="text-xs text-slate-500">Default location</p> : null}
                    </div>
                    <Input label="Quantity" type="number" min="0" step="0.01" value={row.qty} onChange={(e) => patchStock(location.id, "qty", e.target.value)} />
                    <Input label="Expiry (optional)" type="date" value={row.expiry_date} onChange={(e) => patchStock(location.id, "expiry_date", e.target.value)} />
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Pick the locations it is sold at to set their stock.</p>
          )}
        </Section>
        )}

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Link to={isEdit ? `/products/${id}` : "/products"}>
            <Button variant="ghost" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saveProduct.isPending}>
            {saveProduct.isPending ? "Saving…" : isEdit ? "Save product" : "Create product"}
          </Button>
        </div>
      </form>
    </section>
  )
}
