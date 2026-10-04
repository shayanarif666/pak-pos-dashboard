export const DASHBOARD_ROLES = ["superadmin", "store_admin", "manager"]

export const ROLE_LABEL = {
  superadmin: "Super Admin",
  store_admin: "Store Admin",
  manager: "Store Manager",
}

export function isDashboardRole(role) {
  return DASHBOARD_ROLES.includes(role)
}

export function isStoreStaff(role) {
  return role === "store_admin" || role === "manager"
}

export function rejectedRoleMessage(role) {
  if (role === "customer") {
    return "Customer accounts belong on the storefront, not this portal."
  }
  if (role === "cashier") {
    return "Cashiers sign in on the desktop POS, not this dashboard."
  }
  return "This portal is for Super Admin, Store Admin, and Store Manager only."
}
