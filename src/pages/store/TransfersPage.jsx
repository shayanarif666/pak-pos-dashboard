import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, ChevronDown, Eye, Pencil, Plus, Trash2, XCircle } from "lucide-react"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import {
  useCancelStockTransfer,
  useCompleteStockTransfer,
  useDeleteStockTransfer,
  useStockTransfersQuery,
} from "../../features/inventory/inventoryQuery.js"
import { TransferViewModal } from "../../features/inventory/TransferViewModal.jsx"
import { useLocationsQuery, useProductsQuery } from "../../features/catalog/catalogQuery.jsx"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { useDashboardLocation } from "../../features/scope/DashboardLocation.jsx"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

/** Every location a transfer goes to. */
const destinationIds = (row) => (row.destinations || []).map((dest) => dest.to_location_id)
const isOpen = (row) => row.status === "on_the_way" || row.status === "pending"
// Received in part or in full = its stock moved: no edit, no delete.
const received = (row) => (row.destinations || []).some((dest) => dest.products.some((line) => line.status === "completed"))

export function TransfersPage() {
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const transfersQuery = useStockTransfersQuery()
  const locationsQuery = useLocationsQuery()
  const productsQuery = useProductsQuery({}, { sellable: true })
  const completeTransfer = useCompleteStockTransfer()
  const cancelTransfer = useCancelStockTransfer()
  const deleteTransfer = useDeleteStockTransfer()
  const [viewing, setViewing] = useState(null)

  const scope = useDashboardLocation()
  const staffName = useStaffNames()
  // A transfer belongs to both ends: the chosen location sees what it sent and what it receives.
  const rows = (transfersQuery.data || []).filter(
    (row) => !scope.locationId || row.from_location_id === scope.locationId || destinationIds(row).includes(scope.locationId)
  )
  const canManage = scope.isAdmin
  const locations = locationsQuery.data || []
  const products = productsQuery.data || []
  const productName = Object.fromEntries(products.map((row) => [row.id, row.title]))
  const locationName = Object.fromEntries(locations.map((row) => [row.id, row.name]))
  const productText = (row) => (row.destinations || []).flatMap((dest) => dest.products.map((line) => productName[line.product_id] || "")).join(" ")

  async function complete(row) {
    const ok = await confirmToast({
      title: `Complete transfer #${row.transfer_number}?`,
      message: "Everything still on the way arrives in full: the source gives it up and each destination gets it.",
      confirmLabel: "Complete",
    })
    if (!ok) return
    try {
      await completeTransfer.mutateAsync(row.id)
      toast(`Transfer #${row.transfer_number} completed`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function cancel(row) {
    const ok = await confirmToast({
      title: `Cancel transfer #${row.transfer_number}?`,
      message: "What is still on the way is cancelled; no stock moves for it.",
      confirmLabel: "Cancel transfer",
    })
    if (!ok) return
    try {
      await cancelTransfer.mutateAsync(row.id)
      toast(`Transfer #${row.transfer_number} cancelled`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  // Soft delete: the transfer leaves the list (and the POS); nothing of it was received, so no stock moved.
  async function remove(row) {
    const ok = await confirmToast({
      title: `Delete transfer #${row.transfer_number}?`,
      message: "It leaves the list and the POS. No stock has moved for it yet, so stock stays as it is.",
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await deleteTransfer.mutateAsync(row.transfer_number)
      toast(`Transfer #${row.transfer_number} deleted`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        section="Inventory"
        title="Stock Transfers"
        description="Stock sent from one location to another. It stays on the way until the receiving location completes it."
        actions={<>
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <Button onClick={() => navigate("/transfers/new")}>
                <Plus className="h-4 w-4" />
                New transfer
              </Button>
            ) : null}
          </div>
        </>}
      />

      <StatCards
        items={[
          { label: "Transfers", value: rows.length },
          { label: "Open", value: rows.filter(isOpen).length, hint: "Pending or on the way" },
          { label: "Received", value: rows.filter((row) => row.status === "received" || row.status === "completed").length },
          { label: "Cancelled", value: rows.filter((row) => row.status === "cancelled" || row.status === "rejected").length },
        ]}
      />
      <DataTable
        title="Stock Transfers"
        columns={[
          { key: "transfer_number", header: "Transfer #", sortValue: (row) => Number(row.transfer_number), render: (row) => <span className="font-semibold text-slate-900">#{row.transfer_number}</span> },
          { key: "from", header: "From", sortValue: (row) => locationName[row.from_location_id], render: (row) => locationName[row.from_location_id] || "—" },
          {
            key: "to",
            header: "To",
            sortValue: (row) => destinationIds(row).map((id) => locationName[id]).join(", "),
            render: (row) => (
              <div className="flex min-w-40 flex-wrap gap-x-3 gap-y-1">
                {(row.destinations || []).map((dest) => (
                  <span key={dest.to_location_id} className="text-sm text-slate-900">{locationName[dest.to_location_id] || "—"}</span>
                ))}
              </div>
            ),
          },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          {
            key: "actions",
            header: "",
            sortable: false,
            render: (row) => {
              const locked = received(row)
              return (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="icon" aria-label="View transfer" title="View" onClick={() => setViewing(row)}><Eye className="h-4 w-4" /></Button>
                  {canManage ? (
                    <>
                      <Button
                        variant="icon"
                        aria-label="Edit transfer"
                        title={locked ? "Received transfers cannot be edited: their stock has moved" : "Edit"}
                        disabled={locked}
                        onClick={() => navigate(`/transfers/${row.transfer_number}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="icon"
                        aria-label="Delete transfer"
                        title={locked ? "Received transfers cannot be deleted: their stock has moved" : "Delete"}
                        disabled={locked}
                        onClick={() => remove(row)}
                      >
                        <Trash2 className={`h-4 w-4 ${locked ? "" : "text-rose-600"}`} />
                      </Button>
                      <StatusMenu disabled={!isOpen(row)} onComplete={() => complete(row)} onCancel={() => cancel(row)} />
                    </>
                  ) : null}
                </div>
              )
            },
          },
        ]}
        rows={rows}
        loading={transfersQuery.isPending}
        error={transfersQuery.error}
        search={{
          placeholder: "Search product, location or note…",
          text: (row) => `#${row.transfer_number} ${locationName[row.from_location_id] || ""} ${destinationIds(row).map((id) => locationName[id]).join(" ")} ${productText(row)} ${row.note || ""}`,
        }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "on_the_way", label: "On the way" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }] },
          ...(scope.locationId
            ? [{ key: "direction", label: "Direction", options: [{ value: "out", label: "Sent" }, { value: "in", label: "Received" }], match: (row, value) => (value === "out" ? row.from_location_id === scope.locationId : destinationIds(row).includes(scope.locationId)) }]
            : []),
        ]}
        dateRange={{ value: (row) => row.created_at }}
        initialSort={{ key: "transfer_number", dir: "desc" }}
        emptyText="No transfers yet."
      />

      <TransferViewModal
        transfer={viewing}
        onClose={() => setViewing(null)}
        locationName={locationName}
        productName={productName}
        staffName={staffName}
      />
    </section>
  )
}

/**
 * "Update status ▾": Complete (everything still on the way arrives) or Cancel. The menu is fixed
 * to the screen under the button, so the table's horizontal scroll does not cut it off.
 */
function StatusMenu({ disabled, onComplete, onCancel }) {
  const [place, setPlace] = useState(null) // { top, right } while open
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!place) return undefined
    const close = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setPlace(null)
    }
    const shut = () => setPlace(null)
    const onKey = (event) => event.key === "Escape" && setPlace(null)
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", onKey)
    window.addEventListener("scroll", shut, true)
    window.addEventListener("resize", shut)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", shut, true)
      window.removeEventListener("resize", shut)
    }
  }, [place])

  function toggle() {
    if (place) return setPlace(null)
    const rect = buttonRef.current.getBoundingClientRect()
    setPlace({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) })
  }
  const pick = (action) => {
    setPlace(null)
    action()
  }
  const item = "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium"

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={disabled ? "Only a transfer on the way can change status" : "Update status"}
        aria-haspopup="menu"
        aria-expanded={Boolean(place)}
        className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-800"
      >
        Update status <ChevronDown className={`h-4 w-4 transition ${place ? "rotate-180" : ""}`} />
      </button>
      {place ? (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: "fixed", top: place.top, right: place.right }}
          className="z-50 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
        >
          <button type="button" role="menuitem" className={`${item} text-emerald-700 hover:bg-emerald-50`} onClick={() => pick(onComplete)}>
            <CheckCircle2 className="h-4 w-4" /> Complete
          </button>
          <button type="button" role="menuitem" className={`${item} text-rose-700 hover:bg-rose-50`} onClick={() => pick(onCancel)}>
            <XCircle className="h-4 w-4" /> Cancel
          </button>
        </div>
      ) : null}
    </>
  )
}
