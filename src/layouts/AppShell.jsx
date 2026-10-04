import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { ChevronDown, LogOut, MapPin, Menu, ShieldCheck, Store, X } from "lucide-react"
import { useAuth } from "../auth/AuthContext.jsx"
import { ROLE_LABEL } from "../auth/roles.js"
import { ErrorBoundary } from "../ui/ErrorBoundary.jsx"
import { activeGroupTitle, flattenNavItems, isNavItemActive, navForRole } from "../nav/nav.js"

const SIGN_OUT_DELAY_MS = 900

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
          ? "bg-brand-700 text-white shadow-[0_6px_16px_rgba(19,92,76,0.25)]"
          : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {item.icon ? <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} /> : null}
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

function NavGroup({ group, items, open, onToggle, onNavigate }) {
  const { pathname } = useLocation()
  const containsActive = group.items.some((item) => isNavItemActive(pathname, item, items))

  if (group.single) {
    const item = group.items[0]
    return (
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={[
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150",
          containsActive ? "bg-brand-700 text-white shadow-[0_6px_16px_rgba(19,92,76,0.25)]" : "text-slate-800 hover:bg-slate-100",
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
          containsActive ? "text-brand-800" : "text-slate-800 hover:bg-slate-100",
          open && !containsActive ? "bg-slate-50" : "",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            containsActive ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600",
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

function SidebarHeader() {
  const { user, store, location } = useAuth()
  const isPlatform = user.role === "superadmin"
  const place = isPlatform
    ? "All stores"
    : user.role === "store_admin"
      ? "All locations"
      : location?.name || "Assigned location"

  return (
    <div className="brand-pattern relative overflow-hidden px-5 pb-5 pt-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-700/30 via-brand-800/55 to-brand-950/85" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold tracking-wide ring-1 ring-white/30 backdrop-blur">
            {initialsOf(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight">{user.name}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-brand-50 ring-1 ring-white/25">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/20 backdrop-blur">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
            {isPlatform ? <ShieldCheck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{isPlatform ? "Platform" : store?.name || "Store"}</p>
            <p className="flex items-center gap-1 truncate text-xs text-brand-100">
              <MapPin className="h-3 w-3 shrink-0" />
              {place}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate, onSignOut }) {
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
      <SidebarHeader />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <NavGroup
            key={group.title}
            group={group}
            items={items}
            open={openGroup === group.title}
            onToggle={() => setOpenGroup((current) => (current === group.title ? null : group.title))}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
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

export function AppShell() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 lg:block">
        <Sidebar onSignOut={handleSignOut} />
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
              className="absolute right-3 top-3 z-10 rounded-lg p-1 text-white hover:text-brand-100"
              onClick={() => setOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} onSignOut={handleSignOut} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-brand-50"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-base font-semibold text-brand-700">Dashboard</span>
        </header>
        <main className="min-h-screen p-6 lg:p-8">
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {signingOut ? <SigningOutOverlay /> : null}
    </div>
  )
}
