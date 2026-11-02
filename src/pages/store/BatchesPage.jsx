import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useBatchesQuery, useCloseBatch, useOpenBatch } from "../../features/lists/listQueries.js"
import { StaffLocationFields, staffLocationBody } from "../../features/lists/StaffLocationFields.jsx"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
import { DataTable, optionsFrom } from "../../ui/DataTable.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { formatDateTime, toNumber } from "../../ui/format.js"

/** Batch History: every cash drawer batch — opening cash, takings per method, counted cash, variance. */
export function BatchesPage() {
  const { params, isAll, locationId } = useDashboardLocation()
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const { toast } = useToast()
  const locationName = useLocationName()
  const staffName = useStaffNames()
  const query = useBatchesQuery(params)
  const rows = useMemo(() => query.data || [], [query.data])
  const openBatch = useOpenBatch()
  const closeBatch = useCloseBatch()
  // Open: who, where and the opening cash. Close: the batch and the cash counted.
  const [opening, setOpening] = useState(null)
  const [closing, setClosing] = useState(null)

  async function submitOpen(event) {
    event.preventDefault()
    try {
      await openBatch.mutateAsync({ ...staffLocationBody(opening, isAdmin), opening_amount: Number(opening.cash || 0) })
      toast("Batch opened")
      setOpening(null)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function submitClose(event) {
    event.preventDefault()
    try {
      await closeBatch.mutateAsync({ staffId: closing.row.cashier_id, batch_id: closing.row.session_number, total_cash: Number(closing.cash || 0) })
      toast(`Batch #${closing.row.session_number} closed`)
      setClosing(null)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  const totals = useMemo(() => {
    const sum = (key) => rows.reduce((acc, row) => acc + Number(row[key] || 0), 0)
    return {
      open: rows.filter((row) => row.status === "open").length,
      sales: sum("total_sales"),
      cash: sum("cash_sales"),
      variance: rows.reduce((acc, row) => acc + Number(row.cash_variance || 0), 0),
    }
  }, [rows])

  const money = (key, label, extra = {}) => ({
    key,
    header: label,
    align: "right",
    sortValue: (row) => toNumber(row[key]),
    render: (row) => <Currency value={row[key]} />,
    ...extra,
  })

  const columns = [
    { key: "session_number", header: "Batch #", sortValue: (row) => Number(row.session_number), render: (row) => <span className="font-semibold text-slate-900">#{row.session_number}</span> },
    { key: "cashier", header: "Staff", sortValue: (row) => staffName(row.cashier_id), render: (row) => staffName(row.cashier_id) },
    ...(isAll ? [{ key: "location", header: "Location", sortValue: (row) => locationName(row.location_id), render: (row) => locationName(row.location_id) }] : []),
    { key: "opened_at", header: "Opened", sortValue: (row) => new Date(row.opened_at), render: (row) => formatDateTime(row.opened_at) },
    { key: "closed_at", header: "Closed", sortValue: (row) => (row.closed_at ? new Date(row.closed_at) : null), render: (row) => formatDateTime(row.closed_at) },
    money("opening_cash", "Opening"),
    money("cash_sales", "Cash"),
    money("card_sales", "Card"),
    money("jazzcash_sales", "JazzCash"),
    money("easypaisa_sales", "EasyPaisa"),
    money("total_sales", "Total sales", { render: (row) => <span className="font-semibold"><Currency value={row.total_sales} /></span> }),
    money("expected_cash", "Expected cash"),
    money("counted_cash", "Counted"),
    money("cash_variance", "Variance", {
      render: (row) =>
        row.cash_variance == null ? "—" : (
          <span className={Number(row.cash_variance) < 0 ? "text-rose-700" : Number(row.cash_variance) > 0 ? "text-amber-700" : ""}>
            <Currency value={row.cash_variance} />
          </span>
        ),
    }),
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) =>
        row.status === "open" ? (
          <Button variant="ghost" onClick={() => setClosing({ row, cash: "" })}>Close batch</Button>
        ) : null,
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Staff"
        title="Batch History"
        description="Cash drawer batches opened and closed on the POS or here: takings per payment method, the cash expected in the drawer, what was counted and the difference."
        actions={<Button onClick={() => setOpening({ staffId: "", locationId: locationId || "", cash: "" })}><Plus className="h-4 w-4" /> Open batch</Button>}
      />
      <StatCards
        items={[
          { label: "Batches", value: rows.length },
          { label: "Open now", value: totals.open },
          { label: "Total sales", value: <Currency value={totals.sales} /> },
          { label: "Cash variance", value: <Currency value={totals.variance} /> },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        search={{ placeholder: "Search batch # or staff…", text: (row) => `#${row.session_number} ${staffName(row.cashier_id)}` }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }] },
          { key: "cashier", label: "Staff", options: optionsFrom(rows, (row) => row.cashier_id, (id) => staffName(id)), match: (row, value) => row.cashier_id === value },
        ]}
        dateRange={{ value: (row) => row.opened_at }}
        initialSort={{ key: "opened_at", dir: "desc" }}
        emptyText="No batches yet."
      />

      <Modal open={Boolean(opening)} onClose={() => setOpening(null)} size="md">
        {opening ? (
          <ModalCard as="form" title="Open a batch" onClose={() => setOpening(null)} onSubmit={submitOpen}>
            <div className="space-y-3">
              <StaffLocationFields value={opening} onChange={setOpening} />
              <Input label="Opening cash in the drawer" type="number" min="0" step="0.01" required value={opening.cash} onChange={(e) => setOpening({ ...opening, cash: e.target.value })} />
              <p className="text-xs text-slate-500">One open batch per staff member. Sales they make go into it until it is closed.</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setOpening(null)}>Cancel</Button>
              <Button type="submit" disabled={openBatch.isPending}>{openBatch.isPending ? "Opening…" : "Open batch"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>

      <Modal open={Boolean(closing)} onClose={() => setClosing(null)} size="md">
        {closing ? (
          <ModalCard as="form" title={`Close batch #${closing.row.session_number}`} onClose={() => setClosing(null)} onSubmit={submitClose}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                <p className="text-slate-500">Staff</p>
                <p className="text-right font-medium text-slate-900">{staffName(closing.row.cashier_id)}</p>
                <p className="text-slate-500">Opening cash</p>
                <p className="text-right font-medium text-slate-900"><Currency value={closing.row.opening_cash} /></p>
                <p className="text-slate-500">Cash sales so far</p>
                <p className="text-right font-medium text-slate-900"><Currency value={closing.row.cash_sales} /></p>
              </div>
              <Input label="Cash counted in the drawer" type="number" min="0" step="0.01" required value={closing.cash} onChange={(e) => setClosing({ ...closing, cash: e.target.value })} />
              <p className="text-xs text-slate-500">The difference from the expected cash is saved as the variance.</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setClosing(null)}>Cancel</Button>
              <Button type="submit" disabled={closeBatch.isPending}>{closeBatch.isPending ? "Closing…" : "Close batch"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>
    </section>
  )
}
