import { useState } from "react"
import { Plus, X } from "lucide-react"
import {
  useBillingsQuery,
  useCreateBilling,
  useStoresQuery,
  useUpdateBilling,
} from "../../features/admin/adminQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

const STATUSES = ["pending", "paid", "failed", "refunded"]
const emptyForm = {
  store_id: "",
  amount: "",
  status: "pending",
  period_start: "",
  period_end: "",
  method_note: "",
}

export function BillingsPage() {
  const { toast } = useToast()
  const billingsQuery = useBillingsQuery()
  const storesQuery = useStoresQuery()
  const createBillingMutation = useCreateBilling()
  const updateBillingMutation = useUpdateBilling()
  const rows = billingsQuery.data || []
  const stores = storesQuery.data || []
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const loading = billingsQuery.isPending || storesQuery.isPending

  function storeName(row) {
    return (
      stores.find((store) => store.id === row.store_id)?.name ||
      (row.store_number ? `Store #${row.store_number}` : row.store_id)
    )
  }

  function closeForm() {
    setShowForm(false)
    setForm(emptyForm)
    setError("")
  }

  async function create(event) {
    event.preventDefault()
    setError("")
    try {
      await createBillingMutation.mutateAsync({
        store_id: form.store_id,
        amount: form.amount === "" ? undefined : Number(form.amount),
        status: form.status,
        period_start: form.period_start,
        period_end: form.period_end,
        method_note: form.method_note || null,
      })
      toast("Billing recorded")
      closeForm()
    } catch (err) {
      setError(err.message)
    }
  }

  async function patchStatus(row, status) {
    try {
      await updateBillingMutation.mutateAsync({ id: row.id, body: { status } })
      toast("Billing updated")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Super Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Billings</h1>
        </div>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Create billing
          </Button>
        ) : null}
      </div>

      <Modal open={showForm} onClose={closeForm} size="lg">
        <form
          onSubmit={create}
          className="rounded-[28px] border border-slate-200 bg-white p-6 max-h-[85vh] overflow-y-auto shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Create billing</h2>
            <Button variant="icon" type="button" onClick={closeForm} aria-label="Close form">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Store"
              required
              value={form.store_id}
              onChange={(event) => setForm({ ...form, store_id: event.target.value })}
            >
              <option value="">Select store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </Select>
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Input
              label="Amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
            <Input
              label="Period start"
              type="date"
              required
              value={form.period_start}
              onChange={(event) => setForm({ ...form, period_start: event.target.value })}
            />
            <Input
              label="Period end"
              type="date"
              required
              value={form.period_end}
              onChange={(event) => setForm({ ...form, period_end: event.target.value })}
            />
            <Input
              label="Method"
              value={form.method_note}
              onChange={(event) => setForm({ ...form, method_note: event.target.value })}
            />
          </div>
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
          <div className="mt-5 flex gap-2">
            <Button type="submit">Create billing</Button>
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {loading ? <PageLoader label="Loading billings…" /> : null}

      {!loading ? (
        <div className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-200 align-middle">
                  <td className="px-4 py-3 font-medium text-slate-900">{storeName(row)}</td>
                  <td className="px-4 py-3 text-slate-800">
                    <Currency value={row.amount} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.period_start ? String(row.period_start).slice(0, 10) : "—"} →{" "}
                    {row.period_end ? String(row.period_end).slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.method_note || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[140px] items-center gap-2">
                      <StatusBadge value={row.status} />
                      <select
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                        value={row.status}
                        onChange={(event) => patchStatus(row, event.target.value)}
                        aria-label={`Update status for ${storeName(row)}`}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <p className="px-4 py-8 text-sm text-slate-500">No billings yet. Record the first payment.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
