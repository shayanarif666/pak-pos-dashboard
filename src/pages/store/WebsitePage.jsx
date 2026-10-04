import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import {
  useBannersQuery,
  useContentQuery,
  useCreateBanner,
  useDeleteBanner,
  usePutContent,
  usePutShipping,
  usePutTheme,
  useShippingQuery,
  useThemeQuery,
  useUpdateBanner,
} from "../../features/settings/settingsQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"

const TABS = [
  ["theme", "Theme"],
  ["banners", "Banners"],
  ["content", "Content"],
  ["shipping", "Shipping"],
]

const THEME_FIELDS = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["accent", "Accent"],
  ["btn_filled_bg", "Filled button background"],
  ["btn_filled_text", "Filled button text"],
  ["btn_filled_hover", "Filled button hover"],
  ["btn_outline_border", "Outline button border"],
  ["btn_outline_text", "Outline button text"],
  ["btn_outline_hover", "Outline button hover"],
  ["btn_text_color", "Text button colour"],
  ["btn_text_hover", "Text button hover"],
]

const CONTENT_FIELDS = [
  ["homepage_headline", "Homepage headline", false],
  ["homepage_subheadline", "Homepage sub-headline", false],
  ["about_title", "About title", false],
  ["about_body", "About", true],
  ["about_mission", "Mission", true],
  ["about_vision", "Vision", true],
  ["contact_title", "Contact title", false],
  ["contact_body", "Contact", true],
  ["faq_body", "FAQ", true],
  ["shipping_body", "Shipping information", true],
  ["terms_body", "Terms & conditions", true],
  ["privacy_body", "Privacy policy", true],
  ["footer_text", "Footer text", true],
]

function pick(source, fields, fallback = "") {
  return Object.fromEntries(fields.map(([key]) => [key, source?.[key] ?? fallback]))
}

/** Storefront settings. Rendered inside Settings → Website (embedded hides the title block). */
export function WebsitePage({ embedded = false }) {
  const [tab, setTab] = useState("theme")
  return (
    <section className="space-y-6">
      <div className={embedded ? "hidden" : ""}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Website</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Storefront</h1>
        <p className="mt-1 text-sm text-slate-500">How your online store looks and what it says. Shipping applies to web orders only.</p>
      </div>
      <p className={embedded ? "text-sm text-slate-500" : "hidden"}>
        How your online store looks and what it says. Shipping applies to web orders only.
      </p>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <Button key={key} variant={tab === key ? "primary" : "ghost"} onClick={() => setTab(key)}>{label}</Button>
        ))}
      </div>
      {tab === "theme" ? <ThemeForm /> : null}
      {tab === "banners" ? <Banners /> : null}
      {tab === "content" ? <ContentForm /> : null}
      {tab === "shipping" ? <ShippingForm /> : null}
    </section>
  )
}

function ThemeForm() {
  const { toast } = useToast()
  const themeQuery = useThemeQuery()
  const putTheme = usePutTheme()
  const [form, setForm] = useState(pick(null, THEME_FIELDS))

  useEffect(() => {
    if (themeQuery.data !== undefined) setForm(pick(themeQuery.data, THEME_FIELDS))
  }, [themeQuery.data])

  async function save(event) {
    event.preventDefault()
    try {
      await putTheme.mutateAsync(form)
      toast("Theme saved")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  if (themeQuery.isPending) return <PageLoader label="Loading theme…" />
  return (
    <form onSubmit={save} className="max-w-3xl rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_FIELDS.map(([key, label], index) => (
          <label key={key} className="block text-sm text-slate-700">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}{index < 3 ? " *" : ""}</span>
            <span className="flex gap-2">
              <input
                type="color"
                aria-label={`${label} picker`}
                className="h-11 w-12 cursor-pointer rounded-xl border border-slate-200 bg-transparent"
                value={/^#[0-9a-f]{6}$/i.test(form[key]) ? form[key] : "#000000"}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
                value={form[key]}
                required={index < 3}
                placeholder="#000000"
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </span>
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="rounded-2xl px-4 py-2 text-sm font-semibold" style={{ background: form.btn_filled_bg || form.primary, color: form.btn_filled_text || "#fff" }}>Filled</span>
        <span className="rounded-2xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: form.btn_outline_border || form.primary, color: form.btn_outline_text || form.primary }}>Outline</span>
        <span className="px-2 py-2 text-sm font-semibold" style={{ color: form.btn_text_color || form.accent }}>Text button</span>
        <Button type="submit" className="ml-auto" disabled={putTheme.isPending}>Save theme</Button>
      </div>
    </form>
  )
}

function ContentForm() {
  const { toast } = useToast()
  const contentQuery = useContentQuery()
  const putContent = usePutContent()
  const [form, setForm] = useState(pick(null, CONTENT_FIELDS))

  useEffect(() => {
    if (contentQuery.data !== undefined) setForm(pick(contentQuery.data, CONTENT_FIELDS))
  }, [contentQuery.data])

  async function save(event) {
    event.preventDefault()
    try {
      await putContent.mutateAsync(form)
      toast("Content saved")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  if (contentQuery.isPending) return <PageLoader label="Loading content…" />
  return (
    <form onSubmit={save} className="max-w-3xl space-y-3 rounded-[28px] border border-slate-200 bg-white p-5">
      {CONTENT_FIELDS.map(([key, label, long]) =>
        long ? (
          <Textarea key={key} label={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        ) : (
          <Input key={key} label={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        )
      )}
      <Button type="submit" disabled={putContent.isPending}>Save content</Button>
    </form>
  )
}

function ShippingForm() {
  const { toast } = useToast()
  const shippingQuery = useShippingQuery()
  const putShipping = usePutShipping()
  const [form, setForm] = useState({ flat_fee: "", free_over_amount: "" })

  useEffect(() => {
    if (shippingQuery.data !== undefined) {
      setForm({
        flat_fee: shippingQuery.data?.flat_fee ?? "",
        free_over_amount: shippingQuery.data?.free_over_amount ?? "",
      })
    }
  }, [shippingQuery.data])

  async function save(event) {
    event.preventDefault()
    try {
      await putShipping.mutateAsync({
        flat_fee: Number(form.flat_fee || 0),
        free_over_amount: form.free_over_amount === "" ? null : Number(form.free_over_amount),
      })
      toast("Shipping saved")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  if (shippingQuery.isPending) return <PageLoader label="Loading shipping…" />
  return (
    <form onSubmit={save} className="max-w-md space-y-3 rounded-[28px] border border-slate-200 bg-white p-5">
      <Input label="Flat shipping fee" type="number" min="0" step="0.01" value={form.flat_fee} onChange={(e) => setForm({ ...form, flat_fee: e.target.value })} />
      <Input label="Free shipping over (optional)" type="number" min="0" step="0.01" value={form.free_over_amount} onChange={(e) => setForm({ ...form, free_over_amount: e.target.value })} />
      <Button type="submit" disabled={putShipping.isPending}>Save shipping</Button>
    </form>
  )
}

function Banners() {
  const { toast, confirmToast } = useToast()
  const bannersQuery = useBannersQuery()
  const createBanner = useCreateBanner()
  const updateBanner = useUpdateBanner()
  const deleteBanner = useDeleteBanner()
  const [form, setForm] = useState({ image_url: "", heading: "", link_url: "" })
  const rows = bannersQuery.data || []

  async function add(event) {
    event.preventDefault()
    try {
      await createBanner.mutateAsync({
        image_url: form.image_url.trim(),
        heading: form.heading.trim() || null,
        link_url: form.link_url.trim() || null,
        sort_order: rows.length,
      })
      setForm({ image_url: "", heading: "", link_url: "" })
      toast("Banner added")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function remove(row) {
    const ok = await confirmToast({ title: "Delete banner?", message: row.heading || row.image_url, confirmLabel: "Delete" })
    if (!ok) return
    try {
      await deleteBanner.mutateAsync(row.id)
      toast("Banner deleted")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid max-w-3xl gap-3 rounded-[28px] border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <Input label="Image URL" required value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        <Input label="Heading" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} />
        <Input label="Link URL" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
        <Button type="submit" className="sm:col-span-3 sm:w-fit" disabled={createBanner.isPending}>Add banner</Button>
      </form>
      {bannersQuery.isPending ? <PageLoader label="Loading banners…" /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <img src={row.image_url} alt={row.heading || "Banner"} className="h-36 w-full object-cover" />
            <div className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{row.heading || "No heading"}</p>
                <Checkbox
                  label="Active"
                  checked={row.is_active}
                  onChange={(e) => updateBanner.mutate({ id: row.id, body: { is_active: e.target.checked } })}
                />
              </div>
              <Button variant="icon" aria-label="Delete banner" onClick={() => remove(row)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!bannersQuery.isPending && !rows.length ? <p className="text-sm text-slate-500">No banners yet.</p> : null}
    </div>
  )
}
