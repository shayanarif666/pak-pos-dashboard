import { useState } from "react"
import { Link } from "react-router-dom"
import { Scale } from "lucide-react"
import { usePatchWeight, useProductsQuery, useWeightQuery } from "../../features/catalog/catalogQuery.jsx"
import { Button } from "../../ui/Button.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

export function WeightPage() {
  const { toast, confirmToast } = useToast()
  const weightQuery = useWeightQuery()
  const productsQuery = useProductsQuery()
  const patchWeight = usePatchWeight()
  const [productId, setProductId] = useState("")
  const rows = weightQuery.data || []
  const products = productsQuery.data || []
  const candidates = products.filter((row) => !row.is_weight_based)

  async function markWeight(event) {
    event.preventDefault()
    if (!productId) return
    try {
      await patchWeight.mutateAsync({ id: productId, is_weight_based: true })
      toast("Product marked as weight based")
      setProductId("")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function clearWeight(product) {
    const ok = await confirmToast({
      title: "Remove weight flag?",
      message: `${product.title} will no longer be treated as a weight product.`,
      confirmLabel: "Remove",
    })
    if (!ok) return
    try {
      await patchWeight.mutateAsync({ id: product.id, is_weight_based: false })
      toast("Weight flag removed")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  if (weightQuery.isPending) return <PageLoader label="Loading weight products…" />

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Weight Manager</h1>
        <p className="mt-1 text-sm text-slate-500">
          Weight products cannot also be pack products. This list comes from GET /products/weight.
        </p>
      </div>

      <form
        onSubmit={markWeight}
        className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-5 md:grid-cols-[1fr_auto]"
      >
        <Select label="Mark product as weight based" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select product</option>
          {candidates.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button type="submit" disabled={!productId || patchWeight.isPending}>
            Save
          </Button>
        </div>
      </form>

      {weightQuery.error ? <p className="text-sm text-rose-700">{weightQuery.error.message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700">
                <Scale className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${row.id}`} className="block truncate font-semibold text-slate-900 hover:text-brand-700">
                  {row.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {row.unit} · SKU {row.sku}
                </p>
              </div>
              <Pill tone="sky">Weight</Pill>
            </div>
            <div className="mt-4">
              <Button variant="ghost" onClick={() => clearWeight(row)}>
                Remove flag
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!rows.length ? <p className="text-sm text-slate-500">No weight-based products yet.</p> : null}
    </section>
  )
}
