import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Search } from "lucide-react"
import { useCreateStockTransfer, useStockTransfersQuery, useUpdateStockTransfer } from "../../features/inventory/inventoryQuery.js"
import { useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"

/*
 * New stock transfer (/transfers/new) or edit one (/transfers/:transferNumber/edit — the same form,
 * filled in, sent to PATCH /stock-transfers/bulk as { items: [{ id, ...the same body }] }): from one location, several products, to several locations,
 * each with its own qty — the Bulk Stock Transfer body:
 * { from_location_id, note, destinations: [{ to_location_id, products: [{ product_id, variant_id?, qty }] }] }.
 */

function Section({ title, description, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

/** Stock of a product (or variant) at a location. */
const stockAt = (product, locationId) =>
  Number((product?.stocks || []).find((row) => row.location_id === locationId)?.qty || 0)

export function TransferFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const locationsQuery = useLocationsQuery()
  // Every sellable row: a product without variants, or each variant of one.
  const productsQuery = useProductsQuery({}, { sellable: true })
  const createTransfer = useCreateStockTransfer()
  const updateTransfer = useUpdateStockTransfer()
  const { transferNumber } = useParams()
  const editing = Boolean(transferNumber)
  const transfersQuery = useStockTransfersQuery()
  const existing = editing ? (transfersQuery.data || []).find((row) => String(row.transfer_number) === String(transferNumber)) : null
  // Part received = its stock moved: it can no longer be changed.
  const locked = Boolean(existing?.destinations?.some((dest) => dest.products.some((line) => line.status === "completed")))
  const [filled, setFilled] = useState(false)

  const [fromId, setFromId] = useState("")
  const [productIds, setProductIds] = useState([])
  const [destinationIds, setDestinationIds] = useState([])
  // { "productId|locationId": qty }
  const [qtys, setQtys] = useState({})
  const [note, setNote] = useState("")
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")

  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const products = useMemo(() => (productsQuery.data || []).filter((row) => !row.has_variants), [productsQuery.data])
  const productById = useMemo(() => new Map(products.map((row) => [row.id, row])), [products])
  const destinations = locations.filter((row) => row.id !== fromId)
  const q = query.trim().toLowerCase()
  const shown = products.filter((row) => !q || `${row.title} ${row.sku || ""} ${row.barcode || ""}`.toLowerCase().includes(q))
  const picked = productIds.map((id) => productById.get(id)).filter(Boolean)
  const pickedDestinations = destinations.filter((row) => destinationIds.includes(row.id))

  // Edit: start from the transfer as it is (the lines still on the way).
  useEffect(() => {
    if (!existing || filled) return
    const open = (existing.destinations || []).flatMap((dest) =>
      dest.products.filter((line) => line.status !== "cancelled").map((line) => ({ ...line, to: dest.to_location_id }))
    )
    setFromId(existing.from_location_id)
    setNote(existing.note || "")
    setProductIds([...new Set(open.map((line) => line.product_id))])
    setDestinationIds([...new Set(open.map((line) => line.to))])
    setQtys(Object.fromEntries(open.map((line) => [`${line.product_id}|${line.to}`, String(Number(line.qty))])))
    setFilled(true)
  }, [existing, filled])

  const toggle = (list, setList, id) => setList(list.includes(id) ? list.filter((value) => value !== id) : [...list, id])
  const key = (productId, locationId) => `${productId}|${locationId}`
  const totalOf = (productId) => pickedDestinations.reduce((sum, location) => sum + Number(qtys[key(productId, location.id)] || 0), 0)

  function chooseFrom(id) {
    setFromId(id)
    // The source cannot also be a destination.
    setDestinationIds((current) => current.filter((value) => value !== id))
  }

  async function save(event) {
    event.preventDefault()
    setError("")
    if (!fromId) return setError("Pick the location the stock leaves from.")
    if (!picked.length) return setError("Pick at least one product.")
    if (!pickedDestinations.length) return setError("Pick at least one location to send to.")
    for (const product of picked) {
      const have = stockAt(product, fromId)
      if (totalOf(product.id) > have) return setError(`${product.title}: only ${have} in stock at the source, ${totalOf(product.id)} sent.`)
    }
    const body = {
      from_location_id: fromId,
      note: note.trim() || null,
      destinations: pickedDestinations
        .map((location) => ({
          to_location_id: location.id,
          products: picked
            .map((product) => ({ product, qty: Number(qtys[key(product.id, location.id)] || 0) }))
            .filter((row) => row.qty > 0)
            .map(({ product, qty }) =>
              // A variant: its product + variant_id.
              product.parent_product_id
                ? { product_id: product.parent_product_id, variant_id: product.id, qty }
                : { product_id: product.id, qty }
            ),
        }))
        .filter((dest) => dest.products.length),
    }
    if (!body.destinations.length) return setError("Enter a quantity for at least one product and location.")
    try {
      if (editing) {
        await updateTransfer.mutateAsync({ id: Number(transferNumber), ...body })
        toast(`Transfer #${transferNumber} updated`)
        navigate("/transfers")
        return
      }
      await createTransfer.mutateAsync(body)
      toast("Transfer created")
      navigate("/transfers")
    } catch (err) {
      setError(err.message)
    }
  }

  if (locationsQuery.isPending || productsQuery.isPending || (editing && transfersQuery.isPending)) return <PageLoader label="Loading…" />
  if (editing && (!existing || locked)) {
    return (
      <section className="space-y-6">
        <Link to="/transfers" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to transfers
        </Link>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {existing ? `Transfer #${transferNumber} has been received in part or in full, so its stock has moved: it can no longer be edited.` : `Transfer #${transferNumber} was not found.`}
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <Link to="/transfers" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        Back to transfers
      </Link>
      <PageHeader
        section="Inventory"
        title={editing ? `Edit transfer #${transferNumber}` : "New stock transfer"}
        description={editing ? "Change the source, products, locations or quantities. Saving replaces what is on the way with this list." : "Send several products from one location to several locations, each with its own quantity."}
      />

      <form onSubmit={save} className="space-y-6">
        <Section title="From" description="The location the stock leaves from.">
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="From location" required value={fromId} onChange={(e) => chooseFrom(e.target.value)}>
              <option value="">Select source</option>
              {locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
            <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Weekly refill" />
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Products" description={fromId ? "In stock at the source is shown next to each." : "Pick the source first to see its stock."}>
            <div className="rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">Products and variants</span>
                <span className="text-xs text-slate-500">{productIds.length} selected</span>
              </div>
              <div className="relative border-b border-slate-100">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, SKU or barcode…" className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none" />
              </div>
              <div className="max-h-80 overflow-y-auto p-1">
                {shown.map((row) => {
                  const checked = productIds.includes(row.id)
                  return (
                    <label key={row.id} className={["flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm", checked ? "bg-brand-50" : "hover:bg-slate-50"].join(" ")}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(productIds, setProductIds, row.id)} className="h-4 w-4 accent-[#135c4c]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-900">{row.title}</span>
                        {fromId ? <span className="block text-xs text-slate-500">{stockAt(row, fromId)} in stock</span> : null}
                      </span>
                    </label>
                  )
                })}
                {!shown.length ? <p className="px-3 py-4 text-center text-sm text-slate-500">No products.</p> : null}
              </div>
            </div>
          </Section>

          <Section title="Send to" description="One location or several.">
            {destinations.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {destinations.map((row) => (
                  <Checkbox key={row.id} label={row.name} checked={destinationIds.includes(row.id)} onChange={() => toggle(destinationIds, setDestinationIds, row.id)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No other location to send to.</p>
            )}
          </Section>
        </div>

        <Section title="Quantities" description="How much of each product goes to each location. Empty = none to that location.">
          {picked.length && pickedDestinations.length ? (
            <>
            {/* Phone: one card per product, a qty per location. */}
            <div className="space-y-3 sm:hidden">
              {picked.map((product) => {
                const have = stockAt(product, fromId)
                const total = totalOf(product.id)
                return (
                  <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-semibold text-slate-900">{product.title}</p>
                      <p className="shrink-0 text-xs text-slate-500">{fromId ? `${have} at source` : ""}</p>
                    </div>
                    <div className="mt-2 space-y-2">
                      {pickedDestinations.map((location) => (
                        <label key={location.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                          <span className="min-w-0 truncate">{location.name}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={qtys[key(product.id, location.id)] ?? ""}
                            onChange={(e) => setQtys((current) => ({ ...current, [key(product.id, location.id)]: e.target.value }))}
                            className="h-10 w-24 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-600"
                          />
                        </label>
                      ))}
                    </div>
                    <p className={["mt-2 text-right text-xs font-semibold", fromId && total > have ? "text-rose-700" : "text-slate-700"].join(" ")}>Sending {total}</p>
                  </div>
                )
              })}
            </div>
            <div className="-mx-5 hidden overflow-x-auto sm:-mx-6 sm:block">
              <table className="ui-table w-full min-w-[560px] text-left text-sm">
                <thead className="border-y border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold sm:px-6">Product</th>
                    <th className="px-3 py-2.5 text-right font-semibold">At source</th>
                    {pickedDestinations.map((location) => <th key={location.id} className="px-3 py-2.5 font-semibold">{location.name}</th>)}
                    <th className="px-5 py-2.5 text-right font-semibold sm:px-6">Sending</th>
                  </tr>
                </thead>
                <tbody>
                  {picked.map((product) => {
                    const have = stockAt(product, fromId)
                    const total = totalOf(product.id)
                    return (
                      <tr key={product.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-2 font-medium text-slate-950 sm:px-6">{product.title}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fromId ? have : "—"}</td>
                        {pickedDestinations.map((location) => (
                          <td key={location.id} className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              aria-label={`${product.title} to ${location.name}`}
                              value={qtys[key(product.id, location.id)] ?? ""}
                              onChange={(e) => setQtys((current) => ({ ...current, [key(product.id, location.id)]: e.target.value }))}
                              className="h-10 w-24 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-600"
                            />
                          </td>
                        ))}
                        <td className={["px-5 py-2 text-right font-semibold tabular-nums sm:px-6", fromId && total > have ? "text-rose-700" : "text-slate-900"].join(" ")}>
                          {total}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Pick products and the locations to send to.</p>
          )}
        </Section>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Link to="/transfers">
            <Button variant="ghost" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createTransfer.isPending || updateTransfer.isPending}>
            {createTransfer.isPending || updateTransfer.isPending ? "Saving…" : editing ? "Save changes" : "Create transfer"}
          </Button>
        </div>
      </form>
    </section>
  )
}
