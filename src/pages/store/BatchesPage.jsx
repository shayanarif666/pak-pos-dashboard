import { useMemo, useState } from "react"
import { Eye, Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useBatchesQuery, useCloseBatch, useDeleteBatch, useOpenBatch, useUpdateBatch } from "../../features/lists/listQueries.js"
import { StaffLocationFields, inputToIso, isoToInput, nowInput, staffLocationBody } from "../../features/lists/StaffLocationFields.jsx"
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

function Variance({ value }) {
  if (value == null) return "—"
  return (
    <span className={Number(value) < 0 ? "text-rose-700" : Number(value) > 0 ? "text-amber-700" : ""}>
      <Currency value={value} />
    </span>
  )
}

/** Batch History: every cash drawer batch — opening cash, takings per method, counted cash, variance. */
export function BatchesPage() {
  const { params, locationId } = useDashboardLocation()
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const { toast, confirmToast } = useToast()
  const locationName = useLocationName()
  const staffName = useStaffNames()
  const query = useBatchesQuery(params)
  const rows = useMemo(() => query.data || [], [query.data])
  const openBatch = useOpenBatch()
  const closeBatch = useCloseBatch()
  const updateBatch = useUpdateBatch()
  const deleteBatch = useDeleteBatch()
  // Open: who, where and the opening cash. Close: the batch and the cash counted.
  const [opening, setOpening] = useState(null)
  const [closing, setClosing] = useState(null)
  const [viewing, setViewing] = useState(null)
  // Edit: the batch row and its fields as typed.
  const [editing, setEditing] = useState(null)

  function openEdit(row) {
    setEditing({
      row,
      opening_cash: String(row.opening_cash ?? ""),
      cash_in: String(row.cash_in ?? 0),
      cash_out: String(row.cash_out ?? 0),
      counted_cash: row.counted_cash == null ? "" : String(row.counted_cash),
      opened_at: isoToInput(row.opened_at),
      closed_at: isoToInput(row.closed_at),
      note: row.note || "",
    })
  }

  async function submitEdit(event) {
    event.preventDefault()
    const closed = editing.row.status === "closed"
    const body = {
      opening_cash: Number(editing.opening_cash || 0),
      cash_in: Number(editing.cash_in || 0),
      cash_out: Number(editing.cash_out || 0),
      opened_at: inputToIso(editing.opened_at),
      note: editing.note.trim() || null,
      ...(closed && editing.counted_cash !== "" ? { counted_cash: Number(editing.counted_cash) } : {}),
      ...(closed && editing.closed_at ? { closed_at: inputToIso(editing.closed_at) } : {}),
    }
    try {
      await updateBatch.mutateAsync({ id: editing.row.session_number, body })
      toast(`Batch #${editing.row.session_number} updated`)
      setEditing(null)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  // Soft delete: the batch leaves Batch History and the reports; the row and its orders stay.
  async function remove(row) {
    const ok = await confirmToast({
      title: `Delete batch #${row.session_number}?`,
      message: `${staffName(row.cashier_id)}'s batch leaves Batch History and the Z-reports. Its orders keep their sales.`,
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await deleteBatch.mutateAsync(row.session_number)
      toast(`Batch #${row.session_number} deleted`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function submitOpen(event) {
    event.preventDefault()
    try {
      await openBatch.mutateAsync({ ...staffLocationBody(opening, isAdmin), opening_amount: Number(opening.cash || 0), opened_at: inputToIso(opening.at) })
      toast("Batch opened")
      setOpening(null)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function submitClose(event) {
    event.preventDefault()
    try {
      await closeBatch.mutateAsync({ staffId: closing.row.cashier_id, batch_id: closing.row.session_number, total_cash: Number(closing.cash || 0), closed_at: inputToIso(closing.at) })
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
    { key: "location", header: "Location", sortValue: (row) => locationName(row.location_id), render: (row) => locationName(row.location_id) },
    { key: "opened_at", header: "Opened", sortValue: (row) => new Date(row.opened_at), render: (row) => formatDateTime(row.opened_at) },
    { key: "closed_at", header: "Closed", sortValue: (row) => (row.closed_at ? new Date(row.closed_at) : null), render: (row) => formatDateTime(row.closed_at) },
    money("opening_cash", "Opening"),
    money("cash_sales", "Cash"),
    money("expected_cash", "Expected"),
    money("cash_variance", "Variance", { render: (row) => <Variance value={row.cash_variance} /> }),
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="icon" aria-label={`View batch #${row.session_number}`} title="View" onClick={() => setViewing(row)}><Eye className="h-4 w-4" /></Button>
          {row.status === "open" ? (
            <Button variant="icon" aria-label={`Close batch #${row.session_number}`} title="Close batch" onClick={() => setClosing({ row, cash: "", at: nowInput() })}><Lock className="h-4 w-4 text-amber-600" /></Button>
          ) : null}
          <Button variant="icon" aria-label={`Edit batch #${row.session_number}`} title="Edit" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label={`Delete batch #${row.session_number}`} title="Delete" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
        </div>
      ),
    },
  ]

  // The batch modal: everything the batch holds.
  const detail = viewing
    ? [
        ["Batch #", `#${viewing.session_number}`],
        ["Status", <StatusBadge key="s" value={viewing.status} />],
        ["Staff", staffName(viewing.cashier_id)],
        ["Location", locationName(viewing.location_id)],
        ["Opened", formatDateTime(viewing.opened_at)],
        ["Closed", formatDateTime(viewing.closed_at)],
        ["Opening cash", <Currency key="o" value={viewing.opening_cash} />],
        ["Cash in", <Currency key="ci" value={viewing.cash_in} />],
        ["Cash out", <Currency key="co" value={viewing.cash_out} />],
        ["Cash sales", <Currency key="c" value={viewing.cash_sales} />],
        ["Card sales", <Currency key="cd" value={viewing.card_sales} />],
        ["JazzCash sales", <Currency key="j" value={viewing.jazzcash_sales} />],
        ["EasyPaisa sales", <Currency key="e" value={viewing.easypaisa_sales} />],
        ["Total sales", <Currency key="t" value={viewing.total_sales} />],
        ["Net sales", <Currency key="n" value={viewing.net_sales} />],
        ["Expected cash", viewing.expected_cash == null ? "—" : <Currency key="x" value={viewing.expected_cash} />],
        ["Counted cash", viewing.counted_cash == null ? "—" : <Currency key="cc" value={viewing.counted_cash} />],
        ["Variance", <Variance key="v" value={viewing.cash_variance} />],
        ["Note", viewing.note || "—"],
      ]
    : []

  return (
    <section className="space-y-6">
      <PageHeader
        section="Staff"
        title="Batch History"
        description="Cash drawer batches opened and closed on the POS or here: takings per payment method, the cash expected in the drawer, what was counted and the difference."
        actions={<Button onClick={() => setOpening({ staffId: "", locationId: locationId || "", cash: "", at: nowInput() })}><Plus className="h-4 w-4" /> Open batch</Button>}
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
        title="Batches"
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
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Opening cash in the drawer" type="number" min="0" step="0.01" required value={opening.cash} onChange={(e) => setOpening({ ...opening, cash: e.target.value })} />
                <Input label="Opened at" type="datetime-local" required value={opening.at} onChange={(e) => setOpening({ ...opening, at: e.target.value })} />
              </div>
              <p className="text-xs text-slate-500">One open batch per staff member. Sales they make go into it until it is closed.</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setOpening(null)}>Cancel</Button>
              <Button type="submit" disabled={openBatch.isPending}>{openBatch.isPending ? "Opening…" : "Open batch"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} size="md">
        {viewing ? (
          <ModalCard title={`Batch #${viewing.session_number}`} onClose={() => setViewing(null)}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              {detail.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              {viewing.status === "open" ? (
                <Button variant="ghost" type="button" onClick={() => { setClosing({ row: viewing, cash: "", at: nowInput() }); setViewing(null) }}><Lock className="h-4 w-4" /> Close batch</Button>
              ) : null}
              <Button type="button" onClick={() => setViewing(null)}>Done</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} size="md">
        {editing ? (
          <ModalCard as="form" title={`Edit batch #${editing.row.session_number}`} onClose={() => setEditing(null)} onSubmit={submitEdit}>
            <p className="text-sm text-slate-600">
              {staffName(editing.row.cashier_id)} · {locationName(editing.row.location_id)} · <StatusBadge value={editing.row.status} />
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input label="Opening cash" type="number" min="0" step="0.01" required value={editing.opening_cash} onChange={(e) => setEditing({ ...editing, opening_cash: e.target.value })} />
              <Input label="Opened at" type="datetime-local" required value={editing.opened_at} onChange={(e) => setEditing({ ...editing, opened_at: e.target.value })} />
              <Input label="Cash in" type="number" min="0" step="0.01" value={editing.cash_in} onChange={(e) => setEditing({ ...editing, cash_in: e.target.value })} />
              <Input label="Cash out" type="number" min="0" step="0.01" value={editing.cash_out} onChange={(e) => setEditing({ ...editing, cash_out: e.target.value })} />
              {editing.row.status === "closed" ? (
                <>
                  <Input label="Cash counted" type="number" min="0" step="0.01" value={editing.counted_cash} onChange={(e) => setEditing({ ...editing, counted_cash: e.target.value })} />
                  <Input label="Closed at" type="datetime-local" min={editing.opened_at || undefined} value={editing.closed_at} onChange={(e) => setEditing({ ...editing, closed_at: e.target.value })} />
                </>
              ) : null}
              <Input className="sm:col-span-2" label="Note" value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Expected cash and the variance are worked out again. Takings come from the sales and are not edited here.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={updateBatch.isPending}>{updateBatch.isPending ? "Saving…" : "Save"}</Button>
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
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Cash counted in the drawer" type="number" min="0" step="0.01" required value={closing.cash} onChange={(e) => setClosing({ ...closing, cash: e.target.value })} />
                <Input label="Closed at" type="datetime-local" required value={closing.at} onChange={(e) => setClosing({ ...closing, at: e.target.value })} />
              </div>
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
