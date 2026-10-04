import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import {
  useAddSupplierLedger,
  useSupplierLedgerQuery,
  useSupplierQuery,
} from "../../features/inventory/inventoryQuery.js"
import { Currency } from "../../ui/Currency.jsx"
import { Plus } from "lucide-react"
import { Button } from "../../ui/Button.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

export function SupplierDetailPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const supplierQuery = useSupplierQuery(id)
  const ledgerQuery = useSupplierLedgerQuery(id)
  const productsQuery = useProductsQuery()
  const locationsQuery = useLocationsQuery()
  const addLedger = useAddSupplierLedger()
  const [showForm, setShowForm] = useState(false)
  const closeForm = () => setShowForm(false)
  const [form, setForm] = useState({
    entry_type: "debit",
    amount: "",
    location_id: "",
    product_id: "",
    qty: "",
    due_date: "",
    note: "",
  })

  const supplier = supplierQuery.data
  const ledger = ledgerQuery.data || []
  const products = productsQuery.data || []
  const locations = locationsQuery.data || []

  async function save(event) {
    event.preventDefault()
    try {
      await addLedger.mutateAsync({
        id,
        body: {
          entry_type: form.entry_type,
          amount: Number(form.amount),
          location_id: form.location_id || null,
          product_id: form.product_id || null,
          qty: form.qty === "" ? null : Number(form.qty),
          due_date: form.due_date || null,
          note: form.note || null,
        },
      })
      toast("Ledger entry added")
      setShowForm(false)
      setForm((current) => ({ ...current, amount: "", qty: "", note: "" }))
    } catch (err) {
      toast(err.message, "error")
    }
  }

  if (supplierQuery.isPending) return <PageLoader label="Loading supplier…" />
  if (supplierQuery.error) return <p className="text-sm text-rose-700">{supplierQuery.error.message}</p>
  if (!supplier) return null

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Suppliers</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{supplier.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {supplier.phone || "—"} · {supplier.email || "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Balance owed</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900"><Currency value={supplier.balance_owed || 0} /></p>
          <Link to="/suppliers" className="mt-2 inline-block text-sm text-brand-700">
            Back to suppliers
          </Link>
          <div className="mt-3">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Add ledger entry
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showForm} onClose={closeForm} size="lg">
      <ModalCard as="form" title="New ledger entry" onClose={closeForm} onSubmit={save}>
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="Entry"
          value={form.entry_type}
          onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
        >
          <option value="debit">Debit (purchase / we owe)</option>
          <option value="credit">Credit (payment / return)</option>
        </Select>
        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <Input
          label="Due date"
          type="date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />
        <Select
          label="Location (for stock)"
          value={form.location_id}
          onChange={(e) => setForm({ ...form, location_id: e.target.value })}
        >
          <option value="">No stock change</option>
          {locations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <Select
          label="Product (optional)"
          value={form.product_id}
          onChange={(e) => setForm({ ...form, product_id: e.target.value })}
        >
          <option value="">None</option>
          {products.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </Select>
        <Input
          label="Qty (with product)"
          type="number"
          min="0"
          step="0.01"
          value={form.qty}
          onChange={(e) => setForm({ ...form, qty: e.target.value })}
        />
        <Input
          className="md:col-span-2"
          label="Note"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <div className="flex items-end">
          <Button type="submit" disabled={addLedger.isPending}>
            Add ledger entry
          </Button>
        </div>
      </div>
      </ModalCard>
      </Modal>

      <div className="grid gap-3">
        {ledger.map((row) => (
          <article
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4"
          >
            <div>
              <Pill tone={row.entry_type === "debit" ? "rose" : "emerald"}>{row.entry_type}</Pill>
              <p className="mt-2 text-sm text-slate-600">{row.note || "No note"}</p>
              <p className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</p>
            </div>
            <p className="text-xl font-semibold text-slate-900"><Currency value={row.amount} /></p>
          </article>
        ))}
      </div>
      {ledgerQuery.isPending ? <PageLoader label="Loading ledger…" /> : null}
      {!ledgerQuery.isPending && !ledger.length ? (
        <p className="text-sm text-slate-500">No ledger entries yet.</p>
      ) : null}
    </section>
  )
}
