import {
  ArrowLeftRight,
  BadgePercent,
  Banknote,
  BarChart3,
  Boxes,
  ClipboardList,
  Clock,
  Database,
  FileWarning,
  FolderTree,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  MapPin,
  Monitor,
  Package,
  Receipt,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  Ticket,
  Truck,
  UserCircle,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react"

/*
 * Sidebar groups. A group with `single: true` renders as one link (no dropdown).
 * Item `roles` limits who sees it; groups left empty for a role are dropped.
 */
const superAdminNav = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [{ to: "/", label: "Overview", icon: LayoutDashboard, end: true }],
  },
  {
    title: "Stores",
    icon: Store,
    items: [
      { to: "/stores/register", label: "Register store", icon: Store },
      { to: "/stores", label: "All stores", icon: ShoppingBag },
    ],
  },
  {
    title: "Plans & licensing",
    icon: KeyRound,
    items: [
      { to: "/plans", label: "Plans", icon: Tags },
      { to: "/licenses", label: "Licenses", icon: KeyRound },
      { to: "/billings", label: "Billings", icon: Receipt },
    ],
  },
  {
    title: "Others",
    icon: Layers,
    items: [
      { to: "/devices", label: "Devices", icon: Monitor },
      { to: "/audit", label: "Audit", icon: ClipboardList },
      { to: "/data", label: "Data tools", icon: Database },
    ],
  },
  {
    title: "Settings",
    icon: UserCircle,
    single: true,
    items: [{ to: "/account", label: "My account", icon: UserCircle }],
  },
]

// Store admin / manager sidebar. Items with roles: ["store_admin"] are hidden from managers.
const storeNav = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    single: true,
    items: [{ to: "/reports", label: "Reports", icon: BarChart3 }],
  },
  {
    title: "Sales",
    icon: ShoppingBag,
    items: [
      { to: "/orders", label: "Orders History", icon: History, end: true },
      { to: "/orders/custom", label: "Custom Sales", icon: ClipboardList },
      { to: "/refunds", label: "Orders Refunds", icon: Receipt },
      { to: "/orders/cancelled", label: "Orders Cancelled", icon: FileWarning },
      { to: "/transactions", label: "Transactions", icon: Banknote },
    ],
  },
  {
    title: "Catalog",
    icon: Package,
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/categories", label: "Categories", icon: FolderTree },
      { to: "/expiry", label: "Product Expiry", icon: FileWarning },
      { to: "/weight", label: "Weight Based Products", icon: Scale },
    ],
  },
  {
    title: "Inventories",
    icon: Boxes,
    items: [
      { to: "/movements", label: "Stock Movements", icon: ArrowLeftRight },
      { to: "/transfers", label: "Stock Transfers", icon: Truck },
    ],
  },
  {
    title: "Locations",
    icon: MapPin,
    items: [
      { to: "/locations", label: "Locations", icon: MapPin },
      { to: "/staff", label: "Add Staff", icon: UserCog },
    ],
  },
  {
    title: "Staff",
    icon: Users,
    items: [
      { to: "/sessions", label: "Sessions History", icon: Clock },
      { to: "/batches", label: "Batch History", icon: Layers },
      { to: "/devices", label: "Devices Registered", icon: Monitor },
    ],
  },
  {
    title: "Billings",
    icon: KeyRound,
    single: true,
    items: [{ to: "/billing", label: "Billings", icon: KeyRound, roles: ["store_admin"] }],
  },
  {
    title: "Audit Logs",
    icon: ClipboardList,
    single: true,
    items: [{ to: "/audit", label: "Audit Logs", icon: ClipboardList }],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { to: "/settings/taxes", label: "Taxes", icon: Receipt },
      { to: "/settings/currency", label: "Currency", icon: Banknote },
      { to: "/settings/account", label: "My Account", icon: UserCircle },
      { to: "/settings/store", label: "Store Information", icon: Store, roles: ["store_admin"] },
    ],
  },
]

export function navForRole(role) {
  const groups = role === "superadmin" ? superAdminNav : storeNav
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}

export function flattenNavItems(groups) {
  return groups.flatMap((group) => group.items)
}

function matchesNavItem(pathname, item) {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** Longest matching path wins so /orders/history does not also activate /orders. */
export function isNavItemActive(pathname, item, allItems) {
  if (!matchesNavItem(pathname, item)) return false
  const best = allItems
    .filter((candidate) => matchesNavItem(pathname, candidate))
    .reduce((a, b) => (a.to.length >= b.to.length ? a : b))
  return best.to === item.to
}

export function activeGroupTitle(pathname, groups) {
  const items = flattenNavItems(groups)
  const group = groups.find((row) => row.items.some((item) => isNavItemActive(pathname, item, items)))
  return group?.title || null
}

export function labelForPath(role, pathname) {
  const items = flattenNavItems(navForRole(role))
  const best = items
    .filter((item) => matchesNavItem(pathname, item))
    .reduce((a, b) => (!a || b.to.length > a.to.length ? b : a), null)
  return best?.label || "Dashboard"
}
