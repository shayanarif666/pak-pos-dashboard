import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useDeleteSurcharge, useSaveSurcharge, useSurchargesQuery } from "../../features/taxes/surchargeQuery.js"
import { Button } from "../../ui/Button.jsx"
import { formatCurrency } from "../../ui/Currency.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { Input } from "../../ui/Input.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { Select } from "../../ui/Select.jsx"
import { Switch } from "../../ui/Switch.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { PAYMENT_METHOD_LABEL } from "../../ui/format.js"

/*
 * Settings › Payment Method Surcharges: what paying by a method adds to the bill —
 * { method, charges, type: percentage (of that payment's share) | fixed (per payment), is_active }.
 * One per method. They replace the old payment-method GST rates.
 */

// Every payment method: cash, card, the wallets, bank transfer, Raast, cheque…
const METHOD_LABEL = PAYMENT_METHOD_LABEL
const emptyForm = { method: "card", type: "percentage", charges: "", is_active: true }

const chargeText = (row) => (row.type === "percentage" ? `${Number(row.charges)}%` : `${formatCurrency(row.charges)} per payment`)

export function SurchargesPage() {
  const { user } = useAuth()
  const canEdit = user?.role === "store_admin"
  const { toast, confirmToast } = useToast()
  const query = useSurchargesQuery()
  const save = useSaveSurcharge()
  const remove = useDeleteSurcharge()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [toggling, setToggling] = useState({})

  const rows = query.data || []
  // One surcharge per method: a new one picks from the methods still free.
  const used = new Set(rows.map((row) => row.method))
  const freeMethods = Object.keys(METHOD_LABEL).filter((method) => !used.has(method) || method === editing?.method)

  function openCreate() {
    setForm({ ...emptyForm, method: Object.keys(METHOD_LABEL).find((method) => !used.has(method)) || "card" })
    setError("")
    setEditing({ id: null, method: null })
  }

  function openEdit(row) {
    setForm({ method: row.method, type: row.type, charges: String(row.charges), is_active: row.is_active })
    setError("")
    setEditing({ id: row.id, method: row.method })
  }

  async function submit(event) {
    event.preventDefault()
    setError("")
    if (form.charges === "" || Number(form.charges) < 0) return setError("Enter the charges.")
    if (form.type === "percentage" && Number(form.charges) > 100) return setError("A percentage cannot be over 100.")
    try {
      await save.mutateAsync({
        id: editing.id,
        body: { method: form.method, type: form.type, charges: Number(form.charges), is_active: form.is_active },
      })
      toast(editing.id ? "Surcharge updated" : "Surcharge added")
      setEditing(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function setActive(row, next) {
    setToggling((current) => ({ ...current, [row.id]: true }))
    try {
      await save.mutateAsync({ id: row.id, body: { is_active: next } })
      toast(next ? `${METHOD_LABEL[row.method]} surcharge on` : `${METHOD_LABEL[row.method]} surcharge off`)
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setToggling((current) => ({ ...current, [row.id]: false }))
    }
  }

  async function del(row) {
    const ok = await confirmToast({ title: "Delete surcharge?", message: `Paying by ${METHOD_LABEL[row.method]} will no longer add anything to the bill.`, confirmLabel: "Delete" })
    if (!ok) return
    try {
      await remove.mutateAsync(row.id)
      toast("Surcharge deleted")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        section="Settings"
        title="Payment Method Surcharges"
        description="What paying by a method adds to the bill: a percentage of that payment's share, or a fixed amount per payment. A split payment adds each method's own surcharge on its part."
        actions={canEdit && freeMethods.length ? <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add surcharge</Button> : null}
      />
      <StatCards
        items={[
          { label: "Surcharges", value: rows.length },
          { label: "Active", value: rows.filter((row) => row.is_active).length },
          { label: "Percentage", value: rows.filter((row) => row.type === "percentage").length },
          { label: "Fixed", value: rows.filter((row) => row.type === "fixed").length },
        ]}
      />
      <DataTable
        columns={[
          { key: "id", header: "#", sortValue: (row) => row.id, render: (row) => <span className="font-semibold text-slate-900">#{row.id}</span> },
          { key: "method", header: "Payment method", render: (row) => <span className="font-medium text-slate-900">{METHOD_LABEL[row.method] || row.method}</span> },
          { key: "charges", header: "Charges", sortValue: (row) => Number(row.charges), render: (row) => chargeText(row) },
          { key: "type", header: "Type", render: (row) => <Pill tone={row.type === "percentage" ? "sky" : "violet"} dot={false}>{row.type === "percentage" ? "Percentage" : "Fixed"}</Pill> },
          {
            key: "is_active",
            header: "Active",
            sortValue: (row) => (row.is_active ? 1 : 0),
            render: (row) =>
              canEdit ? (
                <Switch checked={row.is_active} disabled={Boolean(toggling[row.id])} label={`${row.is_active ? "Switch off" : "Switch on"} ${METHOD_LABEL[row.method]}`} onChange={(next) => setActive(row, next)} />
              ) : (
                <Pill tone={row.is_active ? "emerald" : "zinc"}>{row.is_active ? "Active" : "Off"}</Pill>
              ),
          },
          ...(canEdit
            ? [
                {
                  key: "actions",
                  header: "",
                  sortable: false,
                  render: (row) => (
                    <div className="flex justify-end gap-1">
                      <Button variant="icon" aria-label="Edit surcharge" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="icon" aria-label="Delete surcharge" onClick={() => del(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        initialSort={{ key: "id", dir: "asc" }}
        emptyText="No surcharges: paying by any method adds nothing to the bill."
      />

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} size="md">
        {editing ? (
          <ModalCard as="form" title={editing.id ? `Edit ${METHOD_LABEL[form.method]} surcharge` : "New surcharge"} onClose={() => setEditing(null)} onSubmit={submit}>
            <div className="grid gap-3">
              <Select label="Payment method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {freeMethods.map((method) => <option key={method} value={method}>{METHOD_LABEL[method]}</option>)}
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (Rs per payment)</option>
                </Select>
                <Input label={form.type === "percentage" ? "Charges %" : "Charges Rs"} type="number" min="0" step="0.01" required value={form.charges} onChange={(e) => setForm({ ...form, charges: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} label="Active" onChange={(next) => setForm({ ...form, is_active: next })} />
                <span className="text-sm text-slate-700">{form.is_active ? "Active — added to the bill" : "Off — not added"}</span>
              </div>
            </div>
            {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : editing.id ? "Save" : "Add surcharge"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>
    </section>
  )
}
