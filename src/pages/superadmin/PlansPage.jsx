import { useState } from "react"
import { Pencil, Plus, X } from "lucide-react"
import { useDeletePlan, usePlansQuery, useSavePlan } from "../../features/admin/adminQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill, StatusBadge } from "../../ui/Pill.jsx"

const empty = {
  code: "",
  type: "monthly",
  name: "",
  price_pkr: "",
  max_devices: "1",
  max_locations: "1",
  features: "",
  is_active: true,
}

export function PlansPage() {
  const { toast, confirmToast } = useToast()
  const plansQuery = usePlansQuery()
  const savePlan = useSavePlan()
  const deletePlanMutation = useDeletePlan()
  const rows = plansQuery.data || []
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const loading = plansQuery.isPending

  function payload() {
    return {
      code: form.code.trim(),
      type: form.type,
      name: form.name.trim(),
      price_pkr: Number(form.price_pkr),
      max_devices: Number(form.max_devices),
      max_locations: Number(form.max_locations),
      features: form.features
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      is_active: form.is_active,
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(empty)
    setError("")
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      if (editingId) {
        const body = payload()
        delete body.code
        await savePlan.mutateAsync({ id: editingId, body })
        toast("Plan updated")
      } else {
        await savePlan.mutateAsync({ body: payload() })
        toast("Plan created")
      }
      closeForm()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(plan) {
    const ok = await confirmToast({
      title: "Delete plan?",
      message: `Remove ${plan.name} (${plan.code})? Stores using it cannot be deleted.`,
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await deletePlanMutation.mutateAsync(plan.id)
      toast("Plan deleted")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  function startCreate() {
    setEditingId(null)
    setForm(empty)
    setShowForm(true)
  }

  function startEdit(plan) {
    setEditingId(plan.id)
    setForm({
      code: plan.code,
      type: plan.type || "monthly",
      name: plan.name,
      price_pkr: plan.price_pkr,
      max_devices: plan.max_devices,
      max_locations: plan.max_locations,
      features: (plan.features || []).join(", "),
      is_active: plan.is_active,
    })
    setShowForm(true)
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Super Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Plans</h1>
        </div>
        {!showForm ? (
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" />
            Create plan
          </Button>
        ) : null}
      </div>

      <Modal open={showForm} onClose={closeForm} size="xl">
        <form
          onSubmit={save}
          className="rounded-[28px] border border-slate-200 bg-white p-6 max-h-[85vh] overflow-y-auto shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? "Edit plan" : "Create plan"}
            </h2>
            <Button variant="icon" type="button" onClick={closeForm} aria-label="Close form">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Code"
              required={!editingId}
              disabled={Boolean(editingId)}
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
            </Select>
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              label="Price (Rs.)"
              type="number"
              min="0"
              required
              value={form.price_pkr}
              onChange={(event) => setForm({ ...form, price_pkr: event.target.value })}
            />
            <Input
              label="Max devices"
              type="number"
              min="1"
              required
              value={form.max_devices}
              onChange={(event) => setForm({ ...form, max_devices: event.target.value })}
            />
            <Input
              label="Max locations"
              type="number"
              min="1"
              required
              value={form.max_locations}
              onChange={(event) => setForm({ ...form, max_locations: event.target.value })}
            />
            <Input
              className="sm:col-span-2"
              label="Features (comma separated)"
              value={form.features}
              onChange={(event) => setForm({ ...form, features: event.target.value })}
            />
            <Checkbox
              className="self-end pb-3"
              label="Active"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
          </div>
          {error || plansQuery.error?.message ? (
            <p className="mt-4 text-sm text-rose-700">{error || plansQuery.error?.message}</p>
          ) : null}
          <div className="mt-5 flex gap-2">
            <Button type="submit">{editingId ? "Update plan" : "Create plan"}</Button>
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {loading ? <PageLoader label="Loading plans…" /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((plan) => (
          <article
            key={plan.id}
            className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">{plan.code}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <StatusBadge value={plan.type} />
                <Pill tone={plan.is_active ? "emerald" : "zinc"}>
                  {plan.is_active ? "Active" : "Inactive"}
                </Pill>
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              <Currency value={plan.price_pkr} />
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone="sky">{plan.max_devices} devices</Pill>
              <Pill tone="violet">{plan.max_locations} locations</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(plan.features || []).slice(0, 6).map((feature) => (
                <Pill key={feature} tone="zinc" className="normal-case tracking-normal">
                  {feature}
                </Pill>
              ))}
            </div>
            <div className="mt-auto flex gap-2 pt-5">
              <Button variant="ghost" onClick={() => startEdit(plan)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="danger" onClick={() => remove(plan)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
