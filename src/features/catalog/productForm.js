import { formatCurrency } from "../../ui/Currency.jsx"

// The units the API accepts (PRODUCT_UNIT on the backend).
export const PRODUCT_UNITS = [
  "piece", "kg", "gram", "liter", "ml", "packet", "box", "dozen", "pair",
  "meter", "yard", "roll", "set", "carton", "bag", "bottle", "can",
]

export const emptyTax = () => ({ name: "GST", type: "percentage", value: "" })

// A variant row: id = an existing variant's product id (edit); none = a new variant. key keeps
// a new row's stock inputs apart until it is saved.
export const emptyVariant = () => ({
  id: null,
  key: `new-${Math.random().toString(36).slice(2, 10)}`,
  variant_number: null,
  name: "",
  sku: "",
  barcode: "",
  cost: "",
  price: "",
  stock: "",
  is_pack_product: false,
  pack_size: "",
  pack_cost: "",
  pack_price: "",
  sell_loose: false,
  is_weight_based: false,
  taxes: [],
})

export const emptyProductForm = {
  title: "",
  barcode: "",
  category_id: "",
  unit: "piece",
  description: "",
  is_pack_product: false,
  cost: "",
  price: "",
  pack_size: "",
  pack_cost: "",
  pack_price: "",
  sell_loose: false,
  is_weight_based: false,
  low_stock_threshold: "10",
  taxes: [],
  variants: [],
  is_active: true,
  is_pos_visible: true,
  is_web_visible: true,
  is_published: false,
  location_scope: "all",
  location_ids: [],
  // Which of those locations hold its stock: all, or the ones in stock_location_ids.
  stock_scope: "all",
  stock_location_ids: [],
}

const text = (value) => (value == null ? "" : String(value))

/** A product from the API as form values (edit). */
export function productToForm(product) {
  return {
    title: product.title || "",
    barcode: product.barcode || "",
    category_id: product.category_id || "",
    unit: product.unit || "piece",
    description: product.description || "",
    is_pack_product: Boolean(product.is_pack_product),
    cost: text(product.cost_price),
    price: text(product.selling_price),
    pack_size: text(product.pack_size),
    pack_cost: text(product.pack_cost_price),
    pack_price: text(product.pack_selling_price),
    sell_loose: Boolean(product.sell_loose),
    is_weight_based: Boolean(product.is_weight_based),
    low_stock_threshold: text(product.low_stock_threshold ?? 10),
    taxes: (product.taxes || []).map((tax) => ({
      name: tax.name || "",
      type: tax.type === "fixed" ? "fixed" : "percentage",
      value: text(tax.value),
    })),
    variants: (product.variants || []).map((row) => ({
      id: row.id,
      key: row.id,
      variant_number: row.variant_number ?? null,
      name: row.name || "",
      sku: row.sku || "",
      barcode: row.barcode || "",
      cost: text(row.cost_price),
      price: text(row.selling_price),
      stock: "",
      is_pack_product: Boolean(row.is_pack_product),
      pack_size: text(row.pack_size),
      pack_cost: text(row.pack_cost_price),
      pack_price: text(row.pack_selling_price),
      sell_loose: Boolean(row.sell_loose),
      is_weight_based: Boolean(row.is_weight_based),
      // Only the variant's own taxes; the product's taxes reach every variant anyway.
      taxes: (row.variant_taxes || []).map((tax) => ({
        name: tax.name || "",
        type: tax.type === "fixed" ? "fixed" : "percentage",
        value: text(tax.value),
      })),
    })),
    is_active: product.is_active !== false,
    is_pos_visible: product.is_pos_visible !== false,
    is_web_visible: product.is_web_visible !== false,
    is_published: Boolean(product.is_published),
    location_scope: product.location_scope || "all",
    location_ids: product.location_ids || [],
    stock_scope: product.stock_scope || "all",
    stock_location_ids: product.stock_location_ids || [],
  }
}

/** Stock inputs of a product as { "key|locationId": { qty, expiry_date } } (key = variant id or "product"). */
export function stockToForm(product) {
  const rows = {}
  const add = (key, stocks) => {
    for (const row of stocks || []) {
      rows[`${key}|${row.location_id}`] = {
        qty: row.qty == null ? "" : String(Number(row.qty)),
        expiry_date: row.expiry_date ? String(row.expiry_date).slice(0, 10) : "",
      }
    }
  }
  if (product.has_variants) for (const variant of product.variants || []) add(variant.id, variant.stocks)
  else add("product", product.stocks)
  return rows
}

/** Checks the form; returns an error message or "". */
export function productFormError(form) {
  if (!form.title.trim()) return "Title is required."
  if (!form.category_id) return "Pick a category."
  // With variants, each variant has its own barcode and prices; the parent's are not needed.
  if (form.variants.length) {
    for (const [index, row] of form.variants.entries()) {
      const label = `Variant ${index + 1}`
      if (!row.name.trim()) return `${label}: enter its name (e.g. Size: M).`
      if (!row.barcode.trim()) return `${label}: enter its barcode (or press Generate).`
      if (row.is_pack_product) {
        if (!(Number(row.pack_size) >= 2)) return `${label}: pack size must be 2 or more.`
        if (!(Number(row.pack_cost) > 0)) return `${label}: enter its pack cost.`
        if (!(Number(row.pack_price) > 0)) return `${label}: enter its pack price.`
      } else {
        if (row.cost === "" || Number(row.cost) < 0) return `${label}: enter its cost.`
        if (row.price === "" || Number(row.price) < 0) return `${label}: enter its price.`
      }
      for (const [t, tax] of row.taxes.entries()) {
        if (tax.value === "" || Number(tax.value) < 0) return `${label}, tax ${t + 1}: enter its value.`
      }
    }
  } else if (!form.barcode.trim()) {
    return "Barcode is required."
  } else if (form.is_pack_product) {
    if (!(Number(form.pack_size) >= 2)) return "Pack size must be 2 or more."
    if (!(Number(form.pack_cost) > 0)) return "Pack cost is required."
    if (!(Number(form.pack_price) > 0)) return "Pack price is required."
  } else if (form.cost === "" || Number(form.cost) < 0) {
    return "Cost is required."
  } else if (form.price === "" || Number(form.price) < 0) {
    return "Price is required."
  }
  for (const [index, tax] of form.taxes.entries()) {
    if (tax.value === "" || Number(tax.value) < 0) return `Tax ${index + 1}: enter its value.`
    if (tax.type === "percentage" && Number(tax.value) > 100) return `Tax ${index + 1}: a percentage cannot be over 100.`
  }
  return ""
}

/**
 * The body for POST / PATCH /products (same names as the API docs: cost, price, pack_cost…).
 * stockFor(key) gives the stock rows of the product ("product") or a variant (its id / key):
 * opening stock on create, the counted stock on edit.
 */
export function productPayload(form, { withScope = false, stockFor = () => undefined } = {}) {
  const hasVariants = form.variants.length > 0
  const body = {
    title: form.title.trim(),
    barcode: form.barcode.trim() || (hasVariants ? null : ""),
    category_id: form.category_id,
    unit: form.unit,
    description: form.description.trim() || null,
    is_pack_product: Boolean(form.is_pack_product),
    sell_loose: Boolean(form.sell_loose),
    is_weight_based: Boolean(form.is_weight_based),
    low_stock_threshold: form.low_stock_threshold === "" ? 10 : Number(form.low_stock_threshold),
    taxes: form.taxes
      .filter((tax) => tax.value !== "")
      .map((tax) => ({ name: tax.name.trim() || null, type: tax.type, value: Number(tax.value) })),
    is_active: Boolean(form.is_active),
    is_pos_visible: Boolean(form.is_pos_visible),
    is_web_visible: Boolean(form.is_web_visible),
    is_published: Boolean(form.is_published),
  }
  if (hasVariants) {
    // Each variant: its own SKU, barcode, prices; stock only when it is new.
    body.is_pack_product = false
    body.variants = form.variants.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      name: row.name.trim(),
      ...(row.sku.trim() ? { sku: row.sku.trim() } : {}),
      barcode: row.barcode.trim(),
      is_pack_product: Boolean(row.is_pack_product),
      is_weight_based: Boolean(row.is_weight_based),
      ...(row.is_pack_product
        ? { pack_size: Number(row.pack_size), pack_cost: Number(row.pack_cost), pack_price: Number(row.pack_price), sell_loose: Boolean(row.sell_loose) }
        : { cost: Number(row.cost), price: Number(row.price) }),
      // Its own taxes, on top of the product's taxes.
      taxes: row.taxes
        .filter((tax) => tax.value !== "")
        .map((tax) => ({ name: tax.name.trim() || null, type: tax.type, value: Number(tax.value) })),
      ...(stockFor(row.id || row.key) ? { stock: stockFor(row.id || row.key) } : {}),
    }))
  } else if (form.is_pack_product) {
    body.pack_size = Number(form.pack_size)
    body.pack_cost = Number(form.pack_cost)
    body.pack_price = Number(form.pack_price)
  } else {
    body.cost = Number(form.cost)
    body.price = Number(form.price)
  }
  if (!hasVariants && stockFor("product")) body.stock = stockFor("product")
  if (withScope) {
    body.location_scope = form.location_scope
    body.location_ids = form.location_scope === "selected" ? form.location_ids : []
    body.stock_scope = form.stock_scope
    body.stock_location_ids = form.stock_scope === "selected" ? form.stock_location_ids : []
  }
  return body
}

export function emptyOpeningStock() {
  return { qty: "", expiry_date: "" }
}

export function money(value) {
  return formatCurrency(value)
}

// Reasons for a manual stock movement (opening_balance is written when a product is created).
export const STOCK_REASONS = [
  "purchase",
  "customer_return",
  "return_to_supplier",
  "damage",
  "expiry",
  "waste",
  "theft",
  "count",
  "other",
]
