import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Plus, Star, Trash2, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useBulkTiersQuery,
  useCategoriesQuery,
  useLocationsQuery,
  useProductQuery,
  useSaveProduct,
} from "../../features/catalog/catalogQuery.jsx"
import { resolveDashboardLocation } from "../../features/catalog/dashboardLocation.js"
import {
  PRODUCT_UNITS,
  emptyOpeningStock,
  emptyProductForm,
  emptyTier,
  productPayload,
  productToForm,
  tiersPayload,
} from "../../features/catalog/productForm.js"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

function galleryFromProduct(product) {
  const list = Array.isArray(product?.images) ? product.images.map((item) => item.url).filter(Boolean) : []
  const featured = product?.featured_image || product?.image_url || null
  if (featured && !list.includes(featured)) list.unshift(featured)
  if (!list.length && product?.image_url) list.push(product.image_url)
  return {
    urls: list,
    featured: featured || list[0] || "",
  }
}

export function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const auth = useAuth()
  const isAdmin = auth.user?.role === "store_admin"
  const dashboardLocation = resolveDashboardLocation(auth)
  const { toast } = useToast()
  const saveProduct = useSaveProduct()
  const categoriesQuery = useCategoriesQuery()
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const productQuery = useProductQuery(id, {}, { enabled: isEdit })
  const tiersQuery = useBulkTiersQuery(id, { enabled: isEdit })
  const [form, setForm] = useState(emptyProductForm)
  const [stock, setStock] = useState(() => emptyOpeningStock())
  const [locationStocks, setLocationStocks] = useState({})
  const [tiers, setTiers] = useState([emptyTier()])
  const [existingUrls, setExistingUrls] = useState([])
  const [featuredUrl, setFeaturedUrl] = useState("")
  const [galleryFiles, setGalleryFiles] = useState([])
  const [featuredFile, setFeaturedFile] = useState(null)
  const [featuredPreview, setFeaturedPreview] = useState("")
  const [sku, setSku] = useState("")
  const [stocks, setStocks] = useState([])
  const [error, setError] = useState("")
  const categories = categoriesQuery.data || []
  const locations = locationsQuery.data || []
  const loading =
    categoriesQuery.isPending ||
    (isAdmin && locationsQuery.isPending) ||
    (isEdit && (productQuery.isPending || tiersQuery.isPending))
  const saving = saveProduct.isPending
  const loadError =
    categoriesQuery.error?.message ||
    locationsQuery.error?.message ||
    productQuery.error?.message ||
    tiersQuery.error?.message ||
    ""

  const managerLocationId = dashboardLocation?.id || ""

  const galleryPreviews = useMemo(
    () => galleryFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [galleryFiles]
  )

  useEffect(() => {
    return () => {
      galleryPreviews.forEach((item) => URL.revokeObjectURL(item.url))
      if (featuredPreview) URL.revokeObjectURL(featuredPreview)
    }
  }, [galleryPreviews, featuredPreview])

  useEffect(() => {
    if (!isAdmin || !locations.length) return
    setLocationStocks((current) => {
      const next = { ...current }
      for (const location of locations) {
        const existing = stocks.find((row) => row.location_id === location.id)
        const prev = next[location.id]
        if (!prev) {
          next[location.id] = {
            qty: existing?.qty ?? "",
            expiry_date: existing?.expiry_date || "",
          }
          continue
        }
        // On edit, fill empty fields from loaded stock once available.
        if (existing && prev.qty === "" && prev.expiry_date === "") {
          next[location.id] = {
            qty: existing.qty ?? "",
            expiry_date: existing.expiry_date || "",
          }
        }
      }
      return next
    })
  }, [isAdmin, locations, stocks])

  useEffect(() => {
    const product = productQuery.data
    if (!product) return
    setForm(productToForm(product))
    setSku(product.sku || "")
    const gallery = galleryFromProduct(product)
    setExistingUrls(gallery.urls)
    setFeaturedUrl(gallery.featured)
    setStocks(product.stocks || [])
  }, [productQuery.data])

  useEffect(() => {
    if (isAdmin || !isEdit || !managerLocationId || !stocks.length) return
    const row = stocks.find((item) => item.location_id === managerLocationId)
    if (!row) return
    setStock({
      qty: row.qty ?? "",
      expiry_date: row.expiry_date || "",
    })
  }, [isAdmin, isEdit, managerLocationId, stocks])

  useEffect(() => {
    const existing = (tiersQuery.data || []).map((row) => ({
      min_qty: row.min_qty ?? "",
      discount_type: row.discount_type || "percentage",
      discount_value: row.discount_value ?? "",
    }))
    if (existing.length) setTiers(existing)
  }, [tiersQuery.data])

  function patch(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function patchLocationStock(locationId, key, value) {
    setLocationStocks((current) => ({
      ...current,
      [locationId]: {
        ...(current[locationId] || emptyOpeningStock()),
        [key]: value,
      },
    }))
  }

  function onGalleryPick(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setGalleryFiles((current) => [...current, ...files])
    event.target.value = ""
  }

  function onFeaturedPick(event) {
    const file = event.target.files?.[0] || null
    if (featuredPreview) URL.revokeObjectURL(featuredPreview)
    setFeaturedFile(file)
    setFeaturedPreview(file ? URL.createObjectURL(file) : "")
    event.target.value = ""
  }

  function removeExisting(url) {
    setExistingUrls((current) => current.filter((item) => item !== url))
    if (featuredUrl === url) {
      setFeaturedUrl((current) => {
        const next = existingUrls.filter((item) => item !== url)
        return next[0] || ""
      })
    }
  }

  function removeGalleryFile(index) {
    setGalleryFiles((current) => current.filter((_, i) => i !== index))
  }

  function buildStockPayloads() {
    const threshold =
      form.low_stock_threshold === "" ? null : Number(form.low_stock_threshold)
    const reason = isEdit ? "count" : "opening_balance"

    if (isAdmin) {
      if (!locations.length) {
        throw new Error("No locations found for this store")
      }
      return locations.map((location) => {
        const row = locationStocks[location.id] || emptyOpeningStock()
        return {
          location_id: location.id,
          qty: Number(row.qty || 0),
          expiry_date: row.expiry_date || null,
          low_stock_threshold: threshold,
          reason,
        }
      })
    }

    if (!managerLocationId) {
      throw new Error("This login has no location, so stock could not be saved")
    }
    return [
      {
        location_id: managerLocationId,
        qty: Number(stock.qty || 0),
        expiry_date: stock.expiry_date || null,
        low_stock_threshold: threshold,
        reason,
      },
    ]
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      const stockPayloads = buildStockPayloads()
      const body = productPayload(form)
      const existingImages = existingUrls.map((url) => ({ url }))
      if (featuredUrl && !featuredFile) {
        body.featured_image = featuredUrl
      }
      const hasMediaChange =
        Boolean(featuredFile) ||
        galleryFiles.length > 0 ||
        isEdit ||
        existingImages.length > 0 ||
        Boolean(body.featured_image)

      const json = await saveProduct.mutateAsync({
        id: isEdit ? id : undefined,
        body,
        featuredFile: featuredFile || undefined,
        imageFiles: galleryFiles,
        existingImages: hasMediaChange ? existingImages : undefined,
        tiers: form.has_bulk_discount ? tiersPayload(tiers) : [],
        stockPayloads,
      })
      const productId = json.productId
      toast(isEdit ? "Product updated" : "Product created with stock")
      navigate(`/products/${productId}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <PageLoader label={isEdit ? "Loading product…" : "Loading form…"} />

  const locationLabel = dashboardLocation?.name || "your login location"

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {isEdit ? "Edit product" : "New product"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isEdit
          ? "One product record is shared by every location. Quantity stays per location."
          : isAdmin
            ? "The product is store-wide. Set opening stock for every location below."
            : `The product is store-wide. Opening stock is saved for ${locationLabel}.`}
      </p>
      {sku ? (
        <p className="mt-2 text-sm text-slate-600">
          SKU <span className="font-medium text-slate-900">{sku}</span> (generated)
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">SKU is generated from the title after save.</p>
      )}

      {error || loadError ? <p className="mt-4 text-sm text-rose-700">{error || loadError}</p> : null}

      <form onSubmit={save} className="mt-6 space-y-6">
        <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:grid-cols-2">
          <Input label="Title" value={form.title} onChange={(e) => patch("title", e.target.value)} required />
          <Select
            label="Category"
            value={form.category_id}
            onChange={(e) => patch("category_id", e.target.value)}
            required
          >
            <option value="">Select category</option>
            {categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
          <Input
            label="Barcode"
            value={form.barcode}
            onChange={(e) => patch("barcode", e.target.value)}
          />
          <Select label="Unit" value={form.unit} onChange={(e) => patch("unit", e.target.value)}>
            {PRODUCT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
          <Input
            label="Cost price"
            type="number"
            min="0"
            step="0.01"
            value={form.cost_price}
            onChange={(e) => patch("cost_price", e.target.value)}
            required
          />
          <Input
            label="Selling price"
            type="number"
            min="0"
            step="0.01"
            value={form.selling_price}
            onChange={(e) => patch("selling_price", e.target.value)}
            required
          />
          <div className="md:col-span-2">
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Images</p>
            <p className="mt-1 text-sm text-slate-600">
              Upload a gallery and pick a featured (showcase) image. A single image is stored as both.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Gallery images"
              type="file"
              accept="image/*"
              multiple
              onChange={onGalleryPick}
            />
            <Input
              label="Featured image (showcase)"
              type="file"
              accept="image/*"
              onChange={onFeaturedPick}
            />
          </div>

          {(existingUrls.length || galleryPreviews.length || featuredPreview || featuredUrl) ? (
            <div className="flex flex-wrap gap-3">
              {existingUrls.map((url) => {
                const isFeatured = featuredUrl === url && !featuredFile
                return (
                  <div
                    key={url}
                    className={`relative overflow-hidden rounded-2xl border ${
                      isFeatured ? "border-amber-200" : "border-slate-200"
                    }`}
                  >
                    <img src={url} alt="" className="h-20 w-20 object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-slate-900/40 p-1">
                      <button
                        type="button"
                        className="rounded-lg bg-brand-50 p-1 text-amber-700 hover:bg-brand-50"
                        title="Set featured"
                        onClick={() => setFeaturedUrl(url)}
                      >
                        <Star className={`h-3.5 w-3.5 ${isFeatured ? "fill-current" : ""}`} />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-brand-50 p-1 text-rose-700 hover:bg-brand-50"
                        title="Remove"
                        onClick={() => removeExisting(url)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isFeatured ? (
                      <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1.5 text-xs font-semibold text-black">
                        Featured
                      </span>
                    ) : null}
                  </div>
                )
              })}
              {galleryPreviews.map((item, index) => (
                <div
                  key={`${item.file.name}-${index}`}
                  className="relative overflow-hidden rounded-2xl border border-brand-300"
                >
                  <img src={item.url} alt="" className="h-20 w-20 object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-lg bg-slate-900/40 p-1 text-rose-700"
                    onClick={() => removeGalleryFile(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {featuredPreview ? (
                <div className="relative overflow-hidden rounded-2xl border border-amber-200">
                  <img src={featuredPreview} alt="" className="h-20 w-20 object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1.5 text-xs font-semibold text-black">
                    Featured
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No images yet.</p>
          )}
        </div>

        <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:grid-cols-2">
          <Input
            label="Low stock threshold"
            type="number"
            min="0"
            value={form.low_stock_threshold}
            onChange={(e) => patch("low_stock_threshold", e.target.value)}
          />
          <Input
            label="Product expiry (optional)"
            type="date"
            value={form.expiry_date}
            onChange={(e) => patch("expiry_date", e.target.value)}
          />
          <Select label="Tax type" value={form.tax_type} onChange={(e) => patch("tax_type", e.target.value)}>
            <option value="">None</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </Select>
          <Input
            label="Tax value"
            type="number"
            min="0"
            value={form.tax_value}
            onChange={(e) => patch("tax_value", e.target.value)}
          />
          <Checkbox
            label="Product discount"
            checked={form.has_product_discount}
            onChange={(e) => patch("has_product_discount", e.target.checked)}
          />
          {form.has_product_discount ? (
            <>
              <Select
                label="Discount type"
                value={form.discount_type}
                onChange={(e) => patch("discount_type", e.target.value)}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </Select>
              <Input
                label="Discount value"
                type="number"
                min="0"
                value={form.discount_value}
                onChange={(e) => patch("discount_value", e.target.value)}
              />
            </>
          ) : null}
          <Checkbox
            label="Pack product"
            checked={form.is_pack_product}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                is_pack_product: e.target.checked,
                is_weight_based: e.target.checked ? false : current.is_weight_based,
              }))
            }
          />
          {form.is_pack_product ? (
            <Input
              label="Pack size"
              type="number"
              min="2"
              value={form.pack_size}
              onChange={(e) => patch("pack_size", e.target.value)}
            />
          ) : null}
          <Checkbox
            label="Sell loose"
            checked={form.sell_loose}
            onChange={(e) => patch("sell_loose", e.target.checked)}
          />
          <Checkbox
            label="Weight based"
            checked={form.is_weight_based}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                is_weight_based: e.target.checked,
                is_pack_product: e.target.checked ? false : current.is_pack_product,
              }))
            }
          />
          <Checkbox
            label="Bulk discount"
            checked={form.has_bulk_discount}
            onChange={(e) => patch("has_bulk_discount", e.target.checked)}
          />
          <Checkbox
            label="Published"
            checked={form.is_published}
            onChange={(e) => patch("is_published", e.target.checked)}
          />
          <Checkbox
            label="POS visible"
            checked={form.is_pos_visible}
            onChange={(e) => patch("is_pos_visible", e.target.checked)}
          />
          <Checkbox
            label="Web visible"
            checked={form.is_web_visible}
            onChange={(e) => patch("is_web_visible", e.target.checked)}
          />
          <Checkbox
            label="Active"
            checked={form.is_active}
            onChange={(e) => patch("is_active", e.target.checked)}
          />
        </div>

        {form.has_bulk_discount ? (
          <div className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Bulk discount tiers</h2>
            {tiers.map((tier, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <Input
                  label="Min qty"
                  type="number"
                  min="1"
                  value={tier.min_qty}
                  onChange={(e) =>
                    setTiers((rows) =>
                      rows.map((row, i) => (i === index ? { ...row, min_qty: e.target.value } : row))
                    )
                  }
                />
                <Select
                  label="Type"
                  value={tier.discount_type}
                  onChange={(e) =>
                    setTiers((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, discount_type: e.target.value } : row
                      )
                    )
                  }
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </Select>
                <Input
                  label="Value"
                  type="number"
                  min="0"
                  value={tier.discount_value}
                  onChange={(e) =>
                    setTiers((rows) =>
                      rows.map((row, i) =>
                        i === index ? { ...row, discount_value: e.target.value } : row
                      )
                    )
                  }
                />
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setTiers((rows) => rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="ghost" type="button" onClick={() => setTiers([...tiers, emptyTier()])}>
              <Plus className="h-4 w-4" />
              Add tier
            </Button>
          </div>
        ) : null}

        <div className="space-y-4 rounded-[28px] border border-brand-300 bg-brand-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              {isEdit ? "Location stock" : "Opening stock"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {isAdmin
                ? "Set quantity (and optional expiry) for every location. Empty quantity saves as 0."
                : `Managers can only manage stock at ${dashboardLocation?.name || "their login location"}.`}
            </p>
          </div>

          {isAdmin ? (
            <div className="space-y-3">
              {locations.map((location) => {
                const row = locationStocks[location.id] || emptyOpeningStock()
                return (
                  <div
                    key={location.id}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 md:grid-cols-[minmax(0,1.2fr)_1fr_1fr]"
                  >
                    <div className="flex flex-col justify-center">
                      <p className="text-sm font-medium text-slate-900">{location.name}</p>
                      {location.is_default ? (
                        <p className="mt-0.5 text-xs text-slate-500">Default location</p>
                      ) : null}
                    </div>
                    <Input
                      label={isEdit ? "Quantity" : "Opening quantity"}
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.qty}
                      onChange={(e) => patchLocationStock(location.id, "qty", e.target.value)}
                    />
                    <Input
                      label="Stock expiry (optional)"
                      type="date"
                      value={row.expiry_date}
                      onChange={(e) =>
                        patchLocationStock(location.id, "expiry_date", e.target.value)
                      }
                    />
                  </div>
                )
              })}
              {!locations.length ? (
                <p className="text-sm text-amber-700">No locations found for this store.</p>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Location"
                value={dashboardLocation?.name || "No location on token"}
                disabled
              />
              <Input
                label={isEdit ? "Quantity" : "Opening quantity"}
                type="number"
                min="0"
                step="0.01"
                value={stock.qty}
                onChange={(e) => setStock((current) => ({ ...current, qty: e.target.value }))}
                required
              />
              <Input
                label="Stock expiry (optional)"
                type="date"
                value={stock.expiry_date}
                onChange={(e) =>
                  setStock((current) => ({ ...current, expiry_date: e.target.value }))
                }
              />
            </div>
          )}
        </div>

        {isEdit && stocks.length && !isAdmin ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Stock by location</h2>
              <Link to="/inventory" className="text-sm text-brand-700 hover:text-brand-700">
                Manage stock
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {stocks.map((row) => (
                <Pill key={row.id} tone={row.is_low ? "rose" : "emerald"}>
                  Loc {row.location_number} · {row.qty}
                </Pill>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Link to={isEdit ? `/products/${id}` : "/products"}>
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save product" : "Create product"}
          </Button>
        </div>
      </form>
    </section>
  )
}
