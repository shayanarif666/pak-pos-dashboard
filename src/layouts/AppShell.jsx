import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { ChevronDown, ChevronRight, LogOut, MapPin, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, Store, X } from "lucide-react"
import { useAuth } from "../auth/AuthContext.jsx"
import { ROLE_LABEL } from "../auth/roles.js"
import { ErrorBoundary } from "../ui/ErrorBoundary.jsx"
import { activeGroupTitle, flattenNavItems, isNavItemActive, labelForPath, navForRole } from "../nav/nav.js"
import { isStoreStaff } from "../auth/roles.js"
import { DashboardLocationProvider, LocationScopeSwitcher } from "../features/scope/DashboardLocation.jsx"

const SIGN_OUT_DELAY_MS = 900
// Laptop / desktop: the sidebar can fold to icons only. The choice is remembered in this browser.
const COLLAPSE_KEY = "dashboard.sidebarCollapsed"
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1"
  } catch {
    return false
  }
}
function saveCollapsed(value) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0")
  } catch {
    // Private window / blocked storage: it just does not stay folded after a reload.
  }
}

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

function SidebarLink({ item, items, onNavigate, nested = false }) {
  const { pathname } = useLocation()
  const active = isNavItemActive(pathname, item, items)

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150",
        nested ? "ml-3" : "",
        active
          ? "bg-brand-700 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {item.icon ? <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} /> : null}
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

function NavGroup({ group, items, open, onToggle, onNavigate, collapsed = false }) {
  const { pathname } = useLocation()
  const containsActive = group.items.some((item) => isNavItemActive(pathname, item, items))

  // Folded sidebar: just the icon. A single page opens right away; a group unfolds the sidebar
  // (and opens that group) so its pages can be picked.
  if (collapsed) {
    const Icon = group.icon
    const box = [
      "mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150",
      containsActive ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ")
    if (group.single) {
      const item = group.items[0]
      return (
        <NavLink to={item.to} end={item.end} onClick={onNavigate} title={group.title} aria-label={group.title} aria-current={containsActive ? "page" : undefined} className={box}>
          <Icon className="h-[20px] w-[20px]" strokeWidth={1.9} />
        </NavLink>
      )
    }
    return (
      <button type="button" onClick={onToggle} title={group.title} aria-label={group.title} className={box}>
        <Icon className="h-[20px] w-[20px]" strokeWidth={1.9} />
      </button>
    )
  }

  if (group.single) {
    const item = group.items[0]
    return (
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={[
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150",
          containsActive ? "bg-brand-700 text-white" : "text-slate-800 hover:bg-slate-100",
        ].join(" ")}
        aria-current={containsActive ? "page" : undefined}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            containsActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          <group.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <span className="flex-1 truncate">{group.title}</span>
      </NavLink>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={[
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150",
          containsActive ? "text-slate-950" : "text-slate-800 hover:bg-slate-100",
          open && !containsActive ? "bg-slate-50" : "",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            containsActive ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          <group.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <span className="flex-1 truncate text-left">{group.title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {/* grid-rows 0fr -> 1fr animates the real content height in both directions */}
      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-200 pb-1 pl-1">
            {group.items.map((item) => (
              <SidebarLink key={item.to} item={item} items={items} onNavigate={onNavigate} nested />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Top of the sidebar: the store (or platform) and the location the user works at. */
function SidebarHeader({ collapsed = false, onToggleCollapse = null }) {
  const { user, store, location } = useAuth()
  const isPlatform = user.role === "superadmin"
  const name = isPlatform ? "Platform" : store?.name || "Store"
  const place = isPlatform
    ? "All stores"
    : user.role === "store_admin"
      ? "All locations"
      : location?.name || "Assigned location"

  const logo = (
    <span title={`${name} · ${place}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
      {isPlatform ? <ShieldCheck className="h-5 w-5" /> : <Store className="h-5 w-5" />}
    </span>
  )
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 border-b border-slate-200 px-2 py-4">
        {logo}
        {onToggleCollapse ? (
          <button type="button" onClick={onToggleCollapse} aria-label="Expand sidebar" title="Expand sidebar" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
      {logo}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold leading-tight text-slate-950">{name}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          {place}
        </p>
      </div>
      {onToggleCollapse ? (
        <button type="button" onClick={onToggleCollapse} aria-label="Collapse sidebar" title="Collapse sidebar" className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
          <PanelLeftClose className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  )
}

/** Bottom of the sidebar: the signed-in user (opens the profile) and sign out. */
function SidebarUser({ onNavigate, onSignOut, collapsed = false }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const active = pathname === "/profile"
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-slate-200 p-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          title={`${user.name} · ${ROLE_LABEL[user.role]}`}
          aria-label="Profile"
          className={["flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white", active ? "ring-2 ring-brand-700 ring-offset-2" : ""].join(" ")}
        >
          {initialsOf(user.name)}
        </NavLink>
        <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700">
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    )
  }
  return (
    <div className="border-t border-slate-200 p-3">
      <div className={["flex items-center gap-2 rounded-2xl p-2 transition", active ? "bg-slate-100" : "hover:bg-slate-50"].join(" ")}>
        <NavLink to="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
            {initialsOf(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-950">{user.name}</span>
            <span className="block truncate text-xs text-slate-500">{ROLE_LABEL[user.role]} · {user.email}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </NavLink>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate, onSignOut, collapsed = false, onToggleCollapse = null, onExpand = null }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const groups = navForRole(user.role)
  const items = flattenNavItems(groups)
  const [openGroup, setOpenGroup] = useState(() => activeGroupTitle(pathname, groups))

  // Follow navigation: the group of the current page opens, the others fold away.
  useEffect(() => {
    const active = activeGroupTitle(pathname, groups)
    if (active) setOpenGroup(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div className="flex h-full flex-col bg-white">
      <SidebarHeader collapsed={collapsed} onToggleCollapse={onToggleCollapse} />

      <nav className={["flex-1 overflow-y-auto px-3 py-4", collapsed ? "space-y-2" : "space-y-1"].join(" ")}>
        {groups.map((group) => (
          <NavGroup
            key={group.title}
            group={group}
            items={items}
            open={openGroup === group.title}
            collapsed={collapsed}
            onToggle={() => {
              // Folded: the click unfolds the sidebar and opens this group.
              if (collapsed) {
                setOpenGroup(group.title)
                onExpand?.()
              } else {
                setOpenGroup((current) => (current === group.title ? null : group.title))
              }
            }}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <SidebarUser onNavigate={onNavigate} onSignOut={onSignOut} collapsed={collapsed} />
    </div>
  )
}

function SigningOutOverlay() {
  return (
    <div className="fade-in fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand-700" />
        <LogOut className="absolute inset-0 m-auto h-6 w-6 text-brand-700" />
      </div>
      <p className="mt-5 text-lg font-semibold text-slate-900">Signing out…</p>
      <p className="mt-1 text-sm text-slate-500">Ending your session securely</p>
    </div>
  )
}

/** Desktop top bar of store pages: the page name and the location the data is for. */
function StoreTopBar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (!isStoreStaff(user?.role)) return null
  return (
    <div className="sticky top-0 z-10 hidden items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-8 py-3 backdrop-blur lg:flex">
      <span className="text-base font-semibold text-slate-950">{labelForPath(user.role, pathname)}</span>
      <LocationScopeSwitcher />
    </div>
  )
}

export function AppShell() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  // Laptop / desktop only: the sidebar folded to icons.
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const setFolded = (value) => {
    setCollapsed(value)
    saveCollapsed(value)
  }

  async function handleSignOut() {
    if (signingOut) return
    setOpen(false)
    setSigningOut(true)
    await new Promise((resolve) => window.setTimeout(resolve, SIGN_OUT_DELAY_MS))
    try {
      await signOut()
    } finally {
      navigate("/login", { replace: true })
    }
  }

  return (
    <DashboardLocationProvider>
    <div className="min-h-screen bg-white text-slate-900">
      <aside className={["fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 transition-[width] duration-200 lg:block", collapsed ? "w-20" : "w-72"].join(" ")}>
        <Sidebar onSignOut={handleSignOut} collapsed={collapsed} onToggleCollapse={() => setFolded(!collapsed)} onExpand={() => setFolded(false)} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-72 border-r border-slate-200 bg-white">
            <button
              type="button"
              className="absolute right-3 top-5 z-10 rounded-lg p-1 text-slate-500 hover:text-slate-900"
              onClick={() => setOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} onSignOut={handleSignOut} />
          </aside>
        </div>
      ) : null}

      <div className={["transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-72"].join(" ")}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="shrink-0 text-base font-semibold text-slate-950">Dashboard</span>
          {isStoreStaff(user?.role) ? <LocationScopeSwitcher className="ml-auto" /> : null}
        </header>
        <StoreTopBar />
        <main className="min-h-screen min-w-0 p-4 sm:p-6 lg:p-8">
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {signingOut ? <SigningOutOverlay /> : null}
    </div>
    </DashboardLocationProvider>
  )
}
