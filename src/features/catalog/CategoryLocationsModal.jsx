import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useLocationsQuery, useUpdateCategoryLocations } from "./catalogQuery.jsx"
import { LocationScopeField, scopePayload } from "../scope/LocationScopeField.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { useToast } from "../../ui/Toast.jsx"

/** When every selected category is sold at the same places, start from that; else All locations. */
function initialScope(categories) {
  const [first, ...rest] = categories
  if (!first) return { location_scope: "all", location_ids: [] }
  const key = (row) =>
    row.location_scope === "selected" ? [...(row.location_ids || [])].sort().join(",") : "all"
  const same = rest.every((row) => key(row) === key(first))
  if (!same || first.location_scope !== "selected") return { location_scope: "all", location_ids: [] }
  return { location_scope: "selected", location_ids: first.location_ids || [] }
}

/** Store admin: set where several categories are sold (all locations or specific ones) at once. */
export function CategoryLocationsModal({ open, categories = [], onClose, onSaved }) {
  const { toast } = useToast()
  const mutation = useUpdateCategoryLocations()
  const locationsQuery = useLocationsQuery({ enabled: open })
  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const [scope, setScope] = useState(initialScope([]))
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setScope(initialScope(categories))
    setError("")
    // Only when the modal opens: the selection does not change while it is open.
  }, [open])

  const count = categories.length
  const label = count === 1 ? "1 category" : `${count} categories`

  async function save(event) {
    event.preventDefault()
    setError("")
    if (scope.location_scope === "selected" && !scope.location_ids.length) {
      return setError("Pick at least one location, or choose All locations.")
    }
    try {
      await mutation.mutateAsync({ category_ids: categories.map((row) => row.id), ...scopePayload(scope) })
      toast(`Locations updated for ${label}`)
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal open={Boolean(open)} onClose={onClose} size="md">
      <form onSubmit={save} className="max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Update locations</h2>
          <button type="button" className="text-slate-600 hover:text-brand-700" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-slate-600">
          Where {label} {count === 1 ? "is" : "are"} sold. This replaces the current locations of every selected category.
        </p>

        <LocationScopeField title="Sold at" value={scope} locations={locations} onChange={setScope} />

        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending || !count}>{mutation.isPending ? "Saving…" : "Update locations"}</Button>
        </div>
      </form>
    </Modal>
  )
}
