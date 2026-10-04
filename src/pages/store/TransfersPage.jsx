import { useState } from "react"
import {
  useCancelStockTransfer,
  useCompleteStockTransfer,
  useCreateStockTransfer,
  useStockTransfersQuery,
} from "../../features/inventory/inventoryQuery.js"
import { useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { Plus } from "lucide-react"
import { Button } from "../../ui/Button.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { Input } from "../../ui/Input.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

export function TransfersPage() {
  const { toast, confirmToast } = useToast()
  const transfersQuery = useStockTransfersQuery()
  const locationsQuery = useLocationsQuery()
  const productsQuery = useProductsQuery()
  const createTransfer = useCreateStockTransfer()
  const completeTransfer = useCompleteStockTransfer()
  const cancelTransfer = useCancelStockTransfer()
  const [form, setForm] = useState({
    product_id: "",
    from_location_id: "",
    to_location_id: "",
    qty: "",
    note: "",
  })
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const closeForm = () => setShowForm(false)

  const rows = transfersQuery.data || []
  const locations = locationsQuery.data || []
  const products = productsQuery.data || []
  const productName = Object.fromEntries(products.map((row) => [row.id, row.title]))
  const locationName = Object.fromEntries(locations.map((row) => [row.id, row.name]))

  async function save(event) {
    event.preventDefault()
    setError("")
    try {
      await createTransfer.mutateAsync({
        product_id: form.product_id,
        from_location_id: form.from_location_id,
        to_location_id: form.to_location_id,
        qty: Number(form.qty),
        note: form.note || null,
      })
      toast("Transfer created")
      setShowForm(false)
      setForm({ product_id: "", from_location_id: "", to_location_id: "", qty: "", note: "" })
    } catch (err) {
      setError(err.message)
    }
  }

  async function complete(row) {
    try {
      await completeTransfer.mutateAsync(row.id)
      toast("Transfer completed")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function cancel(row) {
    const ok = await confirmToast({
      title: "Cancel transfer?",
      message: "Only a pending transfer can be cancelled.",
      confirmLabel: "Cancel transfer",
    })
    if (!ok) return
    try {
      await cancelTransfer.mutateAsync(row.id)
      toast("Transfer cancelled")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Stock Transfers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Store Admin only. Requires a multi-branch plan. Complete moves stock from one location to another.
        </p>
      </div>
        <Button onClick={() => { setError(""); setShowForm(true) }}>
          <Plus className="h-4 w-4" />
          New transfer
        </Button>
      </div>

      <Modal open={showForm} onClose={closeForm} size="lg">
      <ModalCard as="form" title="New stock transfer" onClose={closeForm} onSubmit={save}>
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="Product"
          required
          value={form.product_id}
          onChange={(e) => setForm({ ...form, product_id: e.target.value })}
        >
          <option value="">Select product</option>
          {products.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </Select>
        <Input
          label="Quantity"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={form.qty}
          onChange={(e) => setForm({ ...form, qty: e.target.value })}
        />
        <Select
          label="From location"
          required
          value={form.from_location_id}
          onChange={(e) => setForm({ ...form, from_location_id: e.target.value })}
        >
          <option value="">Select source</option>
          {locations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <Select
          label="To location"
          required
          value={form.to_location_id}
          onChange={(e) => setForm({ ...form, to_location_id: e.target.value })}
        >
          <option value="">Select destination</option>
          {locations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <Input
          className="md:col-span-2"
          label="Note"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        {error ? <p className="md:col-span-2 text-sm text-rose-700">{error}</p> : null}
        <div>
          <Button type="submit" disabled={createTransfer.isPending}>
            Create transfer
          </Button>
        </div>
      </div>
      </ModalCard>
      </Modal>

      {transfersQuery.isPending ? <PageLoader label="Loading transfers…" /> : null}
      {transfersQuery.error ? (
        <p className="text-sm text-rose-700">{transfersQuery.error.message}</p>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4"
          >
            <div>
              <p className="font-medium text-slate-900">{productName[row.product_id] || row.product_id}</p>
              <p className="text-sm text-slate-600">
                {locationName[row.from_location_id] || row.from_location_id} →{" "}
                {locationName[row.to_location_id] || row.to_location_id} · Qty {row.qty}
              </p>
              {row.note ? <p className="text-xs text-slate-500">{row.note}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={row.status} />
              {row.status === "pending" ? (
                <>
                  <Button onClick={() => complete(row)}>Complete</Button>
                  <Button variant="danger" onClick={() => cancel(row)}>
                    Cancel
                  </Button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!transfersQuery.isPending && !rows.length ? (
        <p className="text-sm text-slate-500">No transfers yet.</p>
      ) : null}
    </section>
  )
}
