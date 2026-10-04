import { useMemo, useState } from "react"
import { Eye, Pencil, Plus, X } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useLocationsQuery } from "../../features/catalog/catalogQuery.jsx"
import {
  useCouponRedemptionsQuery,
  useCouponsQuery,
  useSaveCoupon,
  useValidateCoupon,
} from "../../features/promotions/promotionQuery.js"
import { Currency, formatCurrency } from "../../ui/Currency.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

const emptyCoupon = {
  code: "",
  type: "percentage",
  value: "",
  location_id: "",
  min_order_amount: "0",
  start_date: "",
  end_date: "",
  usage_limit: "",
  is_active: true,
  pos_enabled: false,
  web_enabled: true,
}

const emptyPreview = {
  code: "",
  order_total: "",
  channel: "web",
  location_id: "",
}

export function CouponsPage() {
  const { user, location } = useAuth()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyCoupon)
  const [previewForm, setPreviewForm] = useState(emptyPreview)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState("")

  const couponsQuery = useCouponsQuery()
  const locationsQuery = useLocationsQuery()
  const saveCoupon = useSaveCoupon()
  const validateCoupon = useValidateCoupon()
  const redemptionsQuery = useCouponRedemptionsQuery(selected?.id, { enabled: Boolean(selected) })

  const coupons = couponsQuery.data || []
  const locations = locationsQuery.data || []
  const locationName = useMemo(
    () => Object.fromEntries(locations.map((row) => [row.id, row.name])),
    [locations]
  )

  function openCreate() {
    setEditingId(null)
    setForm({
      ...emptyCoupon,
      location_id: user.role === "manager" ? location?.id || "" : "",
    })
    setError("")
    setShowForm(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      code: row.code || "",
      type: row.type || "percentage",
      value: row.value ?? "",
      location_id: row.location_id || "",
      min_order_amount: row.min_order_amount ?? "0",
      start_date: toLocalInput(row.start_date),
      end_date: toLocalInput(row.end_date),
      usage_limit: row.usage_limit ?? "",
      is_active: row.is_active !== false,
      pos_enabled: row.pos_enabled === true,
      web_enabled: row.web_enabled !== false,
    })
    setError("")
    setShowForm(true)
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      await saveCoupon.mutateAsync({
        id: editingId,
        body: {
          code: form.code.trim(),
          type: form.type,
          value: Number(form.value),
          location_id: form.location_id || null,
          min_order_amount: form.min_order_amount === "" ? 0 : Number(form.min_order_amount),
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
          is_active: form.is_active,
          pos_enabled: form.pos_enabled,
          web_enabled: form.web_enabled,
        },
      })
      toast(editingId ? "Coupon updated" : "Coupon created")
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function validate(event) {
    event.preventDefault()
    setPreview(null)
    setError("")
    try {
      const json = await validateCoupon.mutateAsync({
        code: previewForm.code.trim(),
        order_total: Number(previewForm.order_total),
        channel: previewForm.channel,
        location_id: previewForm.location_id || null,
      })
      setPreview(json.data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Promotions</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Coupons</h1>
          <p className="mt-1 text-sm text-slate-500">Order-level coupon codes for web and POS checkout.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add coupon
        </Button>
      </div>

      <form onSubmit={validate} className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-5 md:grid-cols-5">
        <Input label="Preview code" required value={previewForm.code} onChange={(e) => setPreviewForm({ ...previewForm, code: e.target.value })} />
        <Input label="Order total" required type="number" min="0" step="0.01" value={previewForm.order_total} onChange={(e) => setPreviewForm({ ...previewForm, order_total: e.target.value })} />
        <Select label="Channel" value={previewForm.channel} onChange={(e) => setPreviewForm({ ...previewForm, channel: e.target.value })}>
          <option value="web">Web</option>
          <option value="pos">POS</option>
        </Select>
        <Select label="Location" value={previewForm.location_id} onChange={(e) => setPreviewForm({ ...previewForm, location_id: e.target.value })}>
          <option value="">Store-wide</option>
          {locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </Select>
        <div className="flex items-end">
          <Button type="submit" variant="ghost" disabled={validateCoupon.isPending}>Validate</Button>
        </div>
        {preview ? (
          <div className="md:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <Pill tone={preview.valid ? "emerald" : "rose"}>{preview.valid ? "Valid" : "Invalid"}</Pill>
            <span className="ml-3 text-slate-700">
              {preview.valid
                ? `Discount ${formatCurrency(preview.discount_amount)} · Payable ${formatCurrency(preview.payable)}`
                : preview.reason}
            </span>
          </div>
        ) : null}
        {error ? <p className="md:col-span-5 text-sm text-rose-700">{error}</p> : null}
      </form>

      {couponsQuery.isPending ? <PageLoader label="Loading coupons…" /> : null}
      {couponsQuery.error ? <p className="text-sm text-rose-700">{couponsQuery.error.message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coupons.map((row) => (
          <article key={row.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{row.code}</h2>
                <p className="text-sm text-slate-600">
                  {row.location_id ? locationName[row.location_id] || "Location" : "Store-wide"}
                </p>
              </div>
              <Pill tone={row.is_active ? "emerald" : "rose"}>{row.is_active ? "Active" : "Off"}</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Pill tone="violet">
                {row.type === "percentage" ? `${row.value}%` : formatCurrency(row.value)}
              </Pill>
              <Pill tone="amber">
                Min <Currency value={row.min_order_amount || 0} />
              </Pill>
              {row.pos_enabled ? <Pill tone="sky">POS</Pill> : null}
              {row.web_enabled ? <Pill tone="emerald">Web</Pill> : null}
              {row.usage_limit ? <Pill tone="zinc">{row.used_count}/{row.usage_limit}</Pill> : null}
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="icon" aria-label="View redemptions" onClick={() => setSelected(row)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="icon" aria-label="Edit coupon" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!couponsQuery.isPending && !coupons.length ? <p className="text-sm text-slate-500">No coupons yet.</p> : null}

      <Modal open={Boolean(showForm)} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="w-full max-w-2xl rounded-3xl border border-slate-300 bg-white p-6">
            <ModalHeader title={editingId ? "Edit coupon" : "New coupon"} onClose={() => setShowForm(false)} />
            {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </Select>
              <Input label="Value" required type="number" min="0.01" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              <Input label="Minimum order" type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
              <Select label="Location" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} disabled={user.role === "manager"}>
                <option value="">Store-wide</option>
                {locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </Select>
              <Input label="Usage limit" type="number" min="1" step="1" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
              <Input label="Start" type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <Input label="End" type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              <Checkbox label="Active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <Checkbox label="Enable on POS" checked={form.pos_enabled} onChange={(e) => setForm({ ...form, pos_enabled: e.target.checked })} />
              <Checkbox label="Enable on Web" checked={form.web_enabled} onChange={(e) => setForm({ ...form, web_enabled: e.target.checked })} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saveCoupon.isPending}>{editingId ? "Save" : "Create"}</Button>
            </div>
          </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="w-full max-w-2xl rounded-3xl border border-slate-300 bg-white p-6">
            <ModalHeader title={`${selected.code} redemptions`} onClose={() => setSelected(null)} />
            {redemptionsQuery.isPending ? <PageLoader label="Loading redemptions…" /> : null}
            <div className="grid gap-2">
              {(redemptionsQuery.data || []).map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">
                    <Currency value={row.amount} /> discount
                  </p>
                  <p className="text-xs text-slate-500">Order {row.order_id} · {row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
                </div>
              ))}
            </div>
            {!redemptionsQuery.isPending && !(redemptionsQuery.data || []).length ? (
              <p className="text-sm text-slate-500">No redemptions yet.</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  )
}

function toLocalInput(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 16)
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <button type="button" className="text-slate-600 hover:text-brand-700" onClick={onClose}>
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
