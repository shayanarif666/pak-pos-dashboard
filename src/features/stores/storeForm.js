export const STORE_STEPS = [
  "Store information",
  "Location",
  "Store Admin",
  "Store Manager",
  "Billing",
  "Settings",
]

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

export function emptyStoreForm() {
  return {
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
    pos_enabled: Boolean(store.pos_enabled),
    web_enabled: Boolean(store.web_enabled),
  }
}

export function storeFormPayload(form, { isEdit }) {
  const payload = {
    plan_id: form.plan_id,
    name: form.name.trim(),
    legal_name: form.legal_name.trim() || null,
    owner_name: (form.owner_name || form.admin_name).trim() || null,
    business_type: form.business_type,
    address: form.address.trim(),
    city: form.city.trim() || null,
    contact_email: form.contact_email.trim(),
    contact_phone: form.contact_phone.trim(),
    domain: form.domain.trim() || null,
    location_name: form.location_name.trim(),
    location_address: (form.location_address || form.address).trim() || null,
    location_city: (form.location_city || form.city).trim() || null,
    location_phone: (form.location_phone || form.contact_phone).trim() || null,
    admin_name: form.admin_name.trim(),
    admin_email: form.admin_email.trim(),
    admin_phone: form.admin_phone.trim() || null,
    admin_pin: form.admin_pin.trim(),
    manager_name: form.manager_name.trim(),
    manager_email: form.manager_email.trim(),
    manager_phone: form.manager_phone.trim() || null,
    manager_pin: form.manager_pin.trim(),
    billing_status: form.billing_status,
    method_note: form.method_note.trim() || null,
    pos_enabled: Boolean(form.pos_enabled),
    web_enabled: Boolean(form.web_enabled),
  }

  if (form.amount !== "" && form.amount != null) {
    payload.amount = Number(form.amount)
  }

  if (!isEdit || form.admin_password.trim()) {
    payload.admin_password = form.admin_password
  }
  if (!isEdit || form.manager_password.trim()) {
    payload.manager_password = form.manager_password
  }

  return payload
}
