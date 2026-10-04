import { formatCurrency } from "../../ui/Currency.jsx"

export const PRODUCT_UNITS = ["piece", "kg", "gram", "liter", "packet", "box"]

export const emptyProductForm = {
  title: "",
  category_id: "",
  description: "",
  barcode: "",
  unit: "piece",
  cost_price: "",
  selling_price: "",
  has_product_discount: false,
  discount_type: "percentage",
  discount_value: "",
  tax_type: "",
  tax_value: "",
  is_pack_product: false,
  pack_size: "",
  sell_loose: false,
  is_weight_based: false,
  has_bulk_discount: false,
  expiry_date: "",
  low_stock_threshold: "10",
  is_published: false,
  is_pos_visible: true,
  is_web_visible: true,
  is_active: true,
}

export function productToForm(product) {
  return {
    title: product.title || "",
    category_id: product.category_id || "",
    description: product.description || "",
    barcode: product.barcode || "",
    unit: product.unit || "piece",
    cost_price: product.cost_price ?? "",
    selling_price: product.selling_price ?? "",
    has_product_discount: Boolean(product.has_product_discount),
    discount_type: product.discount_type || "percentage",
    discount_value: product.discount_value ?? "",
    tax_type: product.tax_type || "",
    tax_value: product.tax_value ?? "",
    is_pack_product: Boolean(product.is_pack_product),
    pack_size: product.pack_size ?? "",
    sell_loose: Boolean(product.sell_loose),
    is_weight_based: Boolean(product.is_weight_based),
    has_bulk_discount: Boolean(product.has_bulk_discount),
    expiry_date: product.expiry_date ? String(product.expiry_date).slice(0, 10) : "",
    low_stock_threshold: product.low_stock_threshold ?? "10",
    is_published: Boolean(product.is_published),
    is_pos_visible: product.is_pos_visible !== false,
    is_web_visible: product.is_web_visible !== false,
    is_active: product.is_active !== false,
  }
}

export function productPayload(form) {
  const body = {
    title: form.title.trim(),
    category_id: form.category_id,
    description: form.description.trim() || null,
    barcode: form.barcode.trim() || null,
    unit: form.unit,
    cost_price: Number(form.cost_price),
    selling_price: Number(form.selling_price),
    has_product_discount: Boolean(form.has_product_discount),
    is_pack_product: Boolean(form.is_pack_product),
    sell_loose: Boolean(form.sell_loose),
    is_weight_based: Boolean(form.is_weight_based),
    has_bulk_discount: Boolean(form.has_bulk_discount),
    expiry_date: form.expiry_date || null,
    low_stock_threshold: form.low_stock_threshold === "" ? 10 : Number(form.low_stock_threshold),
    is_published: Boolean(form.is_published),
    is_pos_visible: Boolean(form.is_pos_visible),
    is_web_visible: Boolean(form.is_web_visible),
    is_active: Boolean(form.is_active),
  }

  if (form.has_product_discount) {
    body.discount_type = form.discount_type || "percentage"
    body.discount_value = Number(form.discount_value)
  } else {
    body.discount_type = null
    body.discount_value = null
  }

  if (form.tax_type) {
    body.tax_type = form.tax_type
    body.tax_value = Number(form.tax_value)
  } else {
    body.tax_type = null
    body.tax_value = null
  }

  if (form.is_pack_product) {
    body.pack_size = Number(form.pack_size)
  } else {
    body.pack_size = null
  }

  return body
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

export function emptyOpeningStock() {
  return {
    qty: "",
    expiry_date: "",
  }
}

export function emptyTier() {
  return { min_qty: "", discount_type: "percentage", discount_value: "" }
}

export function tiersPayload(rows) {
  return rows
    .filter((row) => row.min_qty !== "" && row.discount_value !== "")
    .map((row) => ({
      min_qty: Number(row.min_qty),
      discount_type: row.discount_type,
      discount_value: Number(row.discount_value),
    }))
}

export function money(value) {
  return formatCurrency(value)
}
