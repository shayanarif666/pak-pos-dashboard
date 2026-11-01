import { formatCurrency } from "../../ui/Currency.jsx"

// The units the API accepts (PRODUCT_UNIT on the backend).
export const PRODUCT_UNITS = [
  "piece", "kg", "gram", "liter", "ml", "packet", "box", "dozen", "pair",
  "meter", "yard", "roll", "set", "carton", "bag", "bottle", "can",
]

export const emptyTax = () => ({ name: "GST", type: "percentage", value: "" })

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
  is_active: true,
  is_pos_visible: true,
  is_web_visible: true,
  is_published: false,
  location_scope: "all",
  location_ids: [],
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
    is_active: product.is_active !== false,
    is_pos_visible: product.is_pos_visible !== false,
    is_web_visible: product.is_web_visible !== false,
    is_published: Boolean(product.is_published),
    location_scope: product.location_scope || "all",
    location_ids: product.location_ids || [],
  }
}

/** Checks the form; returns an error message or "". */
export function productFormError(form) {
  if (!form.title.trim()) return "Title is required."
  if (!form.barcode.trim()) return "Barcode is required."
  if (!form.category_id) return "Pick a category."
  if (form.is_pack_product) {
    if (!(Number(form.pack_size) >= 2)) return "Pack size must be 2 or more."
    if (!(Number(form.pack_cost) > 0)) return "Pack cost is required."
    if (!(Number(form.pack_price) > 0)) return "Pack price is required."
  } else {
    if (form.cost === "" || Number(form.cost) < 0) return "Cost is required."
    if (form.price === "" || Number(form.price) < 0) return "Price is required."
  }
  for (const [index, tax] of form.taxes.entries()) {
    if (tax.value === "" || Number(tax.value) < 0) return `Tax ${index + 1}: enter its value.`
    if (tax.type === "percentage" && Number(tax.value) > 100) return `Tax ${index + 1}: a percentage cannot be over 100.`
  }
  return ""
}

/** The body for POST / PATCH /products (same names as the API docs: cost, price, pack_cost…). */
export function productPayload(form, { withScope = false } = {}) {
  const body = {
    title: form.title.trim(),
    barcode: form.barcode.trim(),
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
  if (form.is_pack_product) {
    body.pack_size = Number(form.pack_size)
    body.pack_cost = Number(form.pack_cost)
    body.pack_price = Number(form.pack_price)
  } else {
    body.cost = Number(form.cost)
    body.price = Number(form.price)
  }
  if (withScope) {
    body.location_scope = form.location_scope
    body.location_ids = form.location_scope === "selected" ? form.location_ids : []
  }
  return body
}

export function emptyOpeningStock() {
  return { qty: "", expiry_date: "" }
}

export function money(value) {
  return formatCurrency(value)
}

export const STOCK_REASONS = [
  "opening_balance",
  "purchase",
  "count",
  "waste",
  "damage",
  "expiry",
  "other",
]
