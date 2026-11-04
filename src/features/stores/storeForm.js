import { PAYMENT_METHODS } from "../../ui/format.js"

// Registration (POST /admin/stores) takes no manager: the store admin adds managers later.
// Edit (PATCH) still updates the first manager; tax settings and status are set at registration only.
export const STORE_STEPS = ["Store information", "Location", "Store Admin", "Billing", "Tax", "Settings"]
export const STORE_EDIT_STEPS = ["Store information", "Location", "Store Admin", "Store Manager", "Billing", "Settings"]

export const BUSINESS_TYPES = [
  "grocery",
  "boutique",
  "retail",
  "pharmacy",
  "restaurant",
  "cafe",
  "bakery",
  "electronics",
  "fashion",
  "clothing",
  "beauty",
  "furniture",
  "hardware",
  "sports",
  "books",
  "jewelry",
  "supermarket",
  "convenience",
  "wholesale",
  "other",
]
export const BILLING_STATUSES = ["pending", "paid", "failed", "refunded"]
export const STORE_STATUSES = [
  { value: "active", label: "Active (purchased plan)" },
  { value: "trial", label: "Trial (3-day free trial)" },
]

// Payment-method GST at registration: the backend defaults (cash 16, card 5, jazzcash 5, easypaisa 5).
const DEFAULT_RATES = { cash: "16", card: "5", jazzcash: "5", easypaisa: "5" }
export const TAX_RATE_METHODS = PAYMENT_METHODS

export function emptyStoreForm() {
  return {
    status: "active",
    plan_id: "",
    name: "",
    legal_name: "",
    owner_name: "",
    business_type: "grocery",
    address: "",
    city: "",
    contact_email: "",
    contact_phone: "",
    domain: "",
    logo_url: "",
    favicon_url: "",
    logo_file: null,
    favicon_file: null,
    location_name: "",
    location_address: "",
    location_city: "",
    location_phone: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_password: "",
    admin_pin: "",
    manager_name: "",
    manager_email: "",
    manager_phone: "",
    manager_password: "",
    manager_pin: "",
    billing_status: "pending",
    amount: "",
    method_note: "",
    billing_note: "",
    ntn: "",
    strn: "",
    charge_tax_on_sales: true,
    fbr_invoice_enabled: false,
    sales_tax_enabled: true,
    sales_tax_rate: "18",
    payment_tax_enabled: true,
    rates: Object.fromEntries(TAX_RATE_METHODS.map(({ value }) => [value, DEFAULT_RATES[value] || ""])),
    pos_enabled: true,
    web_enabled: true,
  }
}

export function storeToForm(store) {
  const location =
    (store.locations || []).find((row) => row.id === store.default_location_id) ||
    (store.locations || []).find((row) => row.is_default) ||
    store.locations?.[0] ||
    {}
  const admin = store.admin || {}
  const manager = store.managers?.[0] || {}
  const billing = store.billings?.[0] || {}

  return {
    ...emptyStoreForm(),
    status: store.status || "active",
    plan_id: store.plan_id || store.plan?.id || "",
    name: store.name || "",
    legal_name: store.legal_name || "",
    owner_name: store.owner_name || "",
    business_type: store.business_type || "grocery",
    address: store.address || "",
    city: store.city || "",
    contact_email: store.contact_email || "",
    contact_phone: store.contact_phone || "",
    domain: store.custom_domain || "",
    logo_url: store.logo_url || "",
    favicon_url: store.favicon_url || "",
    location_name: location.name || "",
    location_address: location.address_line || "",
    location_city: location.city || "",
    location_phone: location.phone || "",
    admin_name: admin.name || "",
    admin_email: admin.email || "",
    admin_phone: admin.phone || "",
    admin_password: "",
    admin_pin: admin.pin || "",
    manager_name: manager.name || "",
    manager_email: manager.email || "",
    manager_phone: manager.phone || "",
    manager_password: "",
    manager_pin: manager.pin || "",
    billing_status: billing.status || "pending",
    amount: billing.amount ?? "",
    method_note: billing.method_note || "",
    billing_note: billing.note || "",
    pos_enabled: Boolean(store.pos_enabled),
    web_enabled: Boolean(store.web_enabled),
  }
}

/** The logo / favicon files picked in the form (sent as multipart). */
export function storeFormFiles(form) {
  return { logo: form.logo_file || null, favicon: form.favicon_file || null }
}

export function storeFormPayload(form, { isEdit }) {
  const text = (value) => String(value ?? "").trim()
  const payload = {
    plan_id: form.plan_id,
    name: text(form.name),
    legal_name: text(form.legal_name) || null,
    owner_name: text(form.owner_name || form.admin_name) || null,
    business_type: form.business_type,
    address: text(form.address),
    city: text(form.city) || null,
    contact_email: text(form.contact_email),
    contact_phone: text(form.contact_phone),
    custom_domain: text(form.domain) || null,
    location_name: text(form.location_name),
    location_address: text(form.location_address || form.address) || null,
    location_city: text(form.location_city || form.city) || null,
    location_phone: text(form.location_phone || form.contact_phone) || null,
    admin_name: text(form.admin_name),
    admin_email: text(form.admin_email),
    admin_phone: text(form.admin_phone) || null,
    admin_pin: text(form.admin_pin),
    billing_status: form.billing_status,
    method_note: text(form.method_note) || null,
    billing_note: text(form.billing_note) || null,
    pos_enabled: Boolean(form.pos_enabled),
    web_enabled: Boolean(form.web_enabled),
  }

  // A picked file uploads in place of the URL; otherwise the URL typed (or kept) is sent.
  if (!form.logo_file) payload.logo_url = text(form.logo_url) || null
  if (!form.favicon_file) payload.favicon_url = text(form.favicon_url) || null

  if (form.amount !== "" && form.amount != null) {
    payload.amount = Number(form.amount)
  }

  if (!isEdit || form.admin_password.trim()) {
    payload.admin_password = form.admin_password
  }

  if (isEdit) {
    payload.manager_name = text(form.manager_name)
    payload.manager_email = text(form.manager_email)
    payload.manager_phone = text(form.manager_phone) || null
    payload.manager_pin = text(form.manager_pin)
    if (form.manager_password.trim()) payload.manager_password = form.manager_password
    // PATCH leaves out the manager when none was entered (a store may have none yet).
    if (!payload.manager_name && !payload.manager_email) {
      for (const key of ["manager_name", "manager_email", "manager_phone", "manager_pin"]) delete payload[key]
    }
    return payload
  }

  // Registration only: status and the tax settings (same fields as PUT /tax-rates).
  payload.status = form.status
  payload.ntn = text(form.ntn) || null
  payload.strn = text(form.strn) || null
  payload.charge_tax_on_sales = Boolean(form.charge_tax_on_sales)
  payload.fbr_invoice_enabled = Boolean(form.fbr_invoice_enabled)
  payload.sales_tax_enabled = Boolean(form.sales_tax_enabled)
  payload.sales_tax_rate = text(form.sales_tax_rate) === "" ? null : Number(form.sales_tax_rate)
  payload.payment_tax_enabled = Boolean(form.payment_tax_enabled)
  payload.rates = Object.entries(form.rates || {})
    .filter(([, value]) => text(value) !== "")
    .map(([payment_method, value]) => ({ payment_method, gst_percent: Number(value) }))
  return payload
}
