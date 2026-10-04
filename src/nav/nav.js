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

const storeNav = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "Catalog",
    icon: Package,
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/categories", label: "Categories", icon: FolderTree },
    ],
  },
  {
    title: "Inventory",
    icon: Boxes,
    items: [
      { to: "/inventory", label: "Stock", icon: Boxes },
      { to: "/movements", label: "Movements", icon: ArrowLeftRight },
      { to: "/expiry", label: "Expiry", icon: FileWarning },
      { to: "/weight", label: "Weight", icon: Scale },
      { to: "/transfers", label: "Transfers", icon: Truck, roles: ["store_admin"] },
      { to: "/suppliers", label: "Suppliers", icon: Warehouse },
    ],
  },
  {
    title: "Sales",
    icon: ShoppingBag,
    items: [
      { to: "/orders", label: "Orders", icon: ShoppingBag },
      { to: "/orders/history", label: "History", icon: History },
      { to: "/orders/custom", label: "Custom sales", icon: ClipboardList },
      { to: "/transactions", label: "Transactions", icon: Banknote },
      { to: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Promotions",
    icon: BadgePercent,
    items: [
      { to: "/offers", label: "Offers", icon: BadgePercent },
      { to: "/coupons", label: "Coupons", icon: Ticket },
      { to: "/reviews", label: "Reviews", icon: ShieldCheck },
    ],
  },
  {
    title: "Point of sale",
    icon: Monitor,
    items: [
      { to: "/shifts", label: "Shift history", icon: Clock },
      { to: "/locations", label: "Locations", icon: MapPin },
      { to: "/staff", label: "Staff", icon: UserCog },
      { to: "/devices", label: "Devices", icon: Monitor },
    ],
  },
  {
    title: "Tax & billings",
    icon: Receipt,
    items: [
      { to: "/tax", label: "Taxes", icon: Receipt },
      { to: "/billing", label: "Billings", icon: Banknote },
    ],
  },
  {
    title: "Others",
    icon: Layers,
    items: [
      { to: "/audit", label: "Audit", icon: ClipboardList },
      { to: "/backup", label: "Backup", icon: Database, roles: ["store_admin"] },
      { to: "/approvals", label: "Approvals", icon: ShieldCheck },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    single: true,
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
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
