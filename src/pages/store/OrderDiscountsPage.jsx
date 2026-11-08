import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useDeleteOrderDiscount, useOrderDiscountsQuery, useSaveOrderDiscount } from "../../features/discounts/discountQuery.js"
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

/*
 * Discounts: the order level discounts, a discount on the whole bill:
 * { name, discount_type, discount_value, apply_to_all_orders, is_active }.
 * The category and product discounts are set on the category / the product; bulk (buy X get Y) and
 * bundle discounts have their own pages.
 */

const emptyForm = { name: "", discount_type: "percentage", discount_value: "", apply_to_all_orders: true, is_active: true }

export const discountAmountText = (row) =>
  row.discount_type === "percentage" ? `${Number(row.discount_value)}%` : formatCurrency(row.discount_value)

export function DiscountsPage() {
  const { toast, confirmToast } = useToast()
  const query = useOrderDiscountsQuery()
  const save = useSaveOrderDiscount()
  const remove = useDeleteOrderDiscount()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [toggling, setToggling] = useState({})

  const rows = query.data || []

  function openCreate() {
    setForm(emptyForm)
    setError("")
    setEditing({ id: null })
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      discount_type: row.discount_type,
      discount_value: String(row.discount_value),
      apply_to_all_orders: Boolean(row.apply_to_all_orders),
      is_active: Boolean(row.is_active),
    })
    setError("")
    setEditing({ id: row.id })
  }

  async function submit(event) {
    event.preventDefault()
    setError("")
    if (!form.name.trim()) return setError("Give the discount a name.")
    if (!(Number(form.discount_value) > 0)) return setError("Enter the discount amount.")
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) return setError("A percentage cannot be over 100.")
    try {
      await save.mutateAsync({
        id: editing.id,
        body: {
          name: form.name.trim(),
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          apply_to_all_orders: form.apply_to_all_orders,
          is_active: form.is_active,
        },
      })
      toast(editing.id ? "Discount updated" : "Discount added")
      setEditing(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function setActive(row, next) {
    setToggling((current) => ({ ...current, [row.id]: true }))
    try {
      await save.mutateAsync({ id: row.id, body: { is_active: next } })
      toast(next ? `${row.name} is active` : `${row.name} is inactive`)
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setToggling((current) => ({ ...current, [row.id]: false }))
    }
  }

  async function del(row) {
    const ok = await confirmToast({
      title: `Delete ${row.name}?`,
      message: "It leaves the list and the POS. Sales already made with it keep their discount.",
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await remove.mutateAsync(row.id)
      toast(`${row.name} deleted`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        section="Discounts"
        title="Discounts"
        description="A discount on the whole order. One that applies to all orders goes on every bill by itself; the others are picked by the cashier. Category and product discounts are set on the category and the product."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add discount</Button>}
      />
      <StatCards
        items={[
          { label: "Discounts", value: rows.length },
          { label: "Active", value: rows.filter((row) => row.is_active).length },
          { label: "On every order", value: rows.filter((row) => row.is_active && row.apply_to_all_orders).length },
          { label: "Picked at checkout", value: rows.filter((row) => !row.apply_to_all_orders).length },
        ]}
      />
      <DataTable
        title="Order discounts"
        columns={[
          { key: "name", header: "Discount name", sortValue: (row) => row.name.toLowerCase(), render: (row) => <div className="min-w-32"><p className="font-medium text-slate-900">{row.name}</p><p className="text-xs text-slate-500">#{row.discount_number}</p></div> },
          { key: "discount_type", header: "Discount type", render: (row) => <Pill tone={row.discount_type === "percentage" ? "sky" : "violet"} dot={false}>{row.discount_type === "percentage" ? "Percentage" : "Fixed"}</Pill> },
          { key: "discount_value", header: "Discount amount", sortValue: (row) => Number(row.discount_value), render: (row) => <span className="font-semibold text-brand-700">{discountAmountText(row)}</span> },
          { key: "apply_to_all_orders", header: "Apply to all orders", sortValue: (row) => (row.apply_to_all_orders ? 1 : 0), render: (row) => <Pill tone={row.apply_to_all_orders ? "emerald" : "zinc"} dot={false}>{row.apply_to_all_orders ? "Yes" : "No"}</Pill> },
          {
            key: "is_active",
            header: "Active",
            sortValue: (row) => (row.is_active ? 1 : 0),
            render: (row) => <Switch checked={Boolean(row.is_active)} disabled={Boolean(toggling[row.id])} label={`${row.is_active ? "Turn off" : "Turn on"} ${row.name}`} onChange={(next) => setActive(row, next)} />,
          },
          {
            key: "actions",
            header: "",
            sortable: false,
            render: (row) => (
              <div className="flex justify-end gap-1">
                <Button variant="icon" aria-label="Edit discount" title="Edit" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="icon" aria-label="Delete discount" title="Delete" onClick={() => del(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
              </div>
            ),
          },
        ]}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        search={{ placeholder: "Search discount…", text: (row) => `${row.name} ${row.discount_number}` }}
        filters={[
          { key: "type", label: "Type", options: [{ value: "percentage", label: "Percentage" }, { value: "fixed", label: "Fixed" }], match: (row, value) => row.discount_type === value },
          { key: "all", label: "Apply to all orders", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }], match: (row, value) => Boolean(row.apply_to_all_orders) === (value === "yes") },
        ]}
        initialSort={{ key: "name", dir: "asc" }}
        emptyText="No order discounts yet."
      />

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} size="md">
        {editing ? (
          <ModalCard as="form" title={editing.id ? "Edit discount" : "New discount"} onClose={() => setEditing(null)} onSubmit={submit}>
            <div className="grid gap-3">
              <Input label="Discount name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Eid Sale" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Discount type" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (Rs off the bill)</option>
                </Select>
                <Input label={form.discount_type === "percentage" ? "Discount amount (%)" : "Discount amount (Rs)"} type="number" min="0" step="0.01" required value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.apply_to_all_orders} label="Apply to all orders" onChange={(next) => setForm({ ...form, apply_to_all_orders: next })} />
                <span className="text-sm text-slate-700">{form.apply_to_all_orders ? "Apply to all orders: goes on every bill by itself" : "The cashier picks it at checkout"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} label="Active" onChange={(next) => setForm({ ...form, is_active: next })} />
                <span className="text-sm text-slate-700">{form.is_active ? "Active" : "Inactive: never applied"}</span>
              </div>
            </div>
            {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : editing.id ? "Save" : "Add discount"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>
    </section>
  )
}
