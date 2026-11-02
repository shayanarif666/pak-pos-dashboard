import { useState } from "react"
import { LogIn, LogOut } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import { useClockIn, useClockOut, useStaffSessionsQuery } from "../../features/lists/listQueries.js"
import { StaffLocationFields, inputToIso, nowInput, staffLocationBody } from "../../features/lists/StaffLocationFields.jsx"
import { Input } from "../../ui/Input.jsx"
import { Button } from "../../ui/Button.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { useStaffQuery } from "../../features/operations/operationsQuery.js"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
import { DataTable } from "../../ui/DataTable.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { formatDateTime } from "../../ui/format.js"

function duration(start, end) {
  if (!start) return "—"
  const ms = (end ? new Date(end) : new Date()) - new Date(start)
  if (!(ms > 0)) return "—"
  const minutes = Math.round(ms / 60000)
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m${end ? "" : " (on duty)"}`
}

/** Sessions History: staff attendance (clock in / clock out), paged by the API. */
export function SessionsPage() {
  const { params: locationParams, isAll, locationId } = useDashboardLocation()
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const { toast } = useToast()
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  // Clock in: who, where and when. Clock out: the session's row and when.
  const [clocking, setClocking] = useState(null)
  const [leaving, setLeaving] = useState(null)

  async function submitClockIn(event) {
    event.preventDefault()
    try {
      await clockIn.mutateAsync({ ...staffLocationBody(clocking, isAdmin), clocked_at: inputToIso(clocking.at) })
      toast("Clocked in")
      setClocking(null)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function submitClockOut(event) {
    event.preventDefault()
    const row = leaving.row
    try {
      await clockOut.mutateAsync({
        staffId: row.staff?.id ?? row.staffId,
        ...(isAdmin && row.location?.id ? { location_id: row.location.id } : {}),
        clocked_at: inputToIso(leaving.at),
      })
      toast("Clocked out")
      setLeaving(null)
    } catch (err) {
      toast(err.message, "error")
    }
  }
  const locationName = useLocationName()
  const staffName = useStaffNames()
  const staff = useStaffQuery().data || []
  const [table, setTable] = useState({ page: 1, limit: 20, filters: {}, from: "", to: "" })

  const query = useStaffSessionsQuery({
    ...locationParams,
    page: table.page,
    limit: table.limit,
    staffId: table.filters.staff || undefined,
    status: table.filters.status || undefined,
    from: table.from || undefined,
    to: table.to ? `${table.to}T23:59:59` : undefined,
  })
  const rows = query.data?.rows || []
  // Who is clocked in right now (only the count is needed).
  const onDuty = useStaffSessionsQuery({ ...locationParams, page: 1, limit: 1, status: "clock_in" }).data?.pagination?.total
  const workedMs = rows.reduce((sum, row) => (row.opening_at && row.closing_at ? sum + (new Date(row.closing_at) - new Date(row.opening_at)) : sum), 0)
  const closed = rows.filter((row) => row.closing_at).length

  const columns = [
    { key: "id", header: "Session #", render: (row) => <span className="font-semibold text-slate-900">#{row.id}</span> },
    // The API sends staff { id, name, role } and location { id, name }; older replies sent the ids.
    { key: "staff", header: "Staff", render: (row) => row.staff?.name || staffName(row.staff?.id ?? row.staffId) },
    ...(isAll
      ? [{ key: "location", header: "Location", render: (row) => row.location?.name || locationName(row.location?.id ?? row.locationId) }]
      : []),
    { key: "opening_at", header: "Clock in", render: (row) => formatDateTime(row.opening_at) },
    { key: "closing_at", header: "Clock out", render: (row) => formatDateTime(row.closing_at) },
    { key: "duration", header: "Worked", render: (row) => duration(row.opening_at, row.closing_at) },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "actions",
      header: "",
      render: (row) =>
        row.status === "clock_in" && !row.closing_at ? (
          <Button variant="ghost" onClick={() => setLeaving({ row, at: nowInput() })}><LogOut className="h-4 w-4" /> Clock out</Button>
        ) : null,
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Staff"
        title="Sessions History"
        description="When each staff member clocked in and out on the POS or here, and how long they worked."
        actions={<Button onClick={() => setClocking({ staffId: "", locationId: locationId || "", at: nowInput() })}><LogIn className="h-4 w-4" /> Clock in</Button>}
      />
      <StatCards
        items={[
          { label: "Sessions", value: query.data?.pagination?.total ?? "—", hint: "With the filters below" },
          { label: "On duty now", value: onDuty ?? "—" },
          { label: "Staff members", value: staff.length },
          { label: "Avg shift (this page)", value: closed ? `${Math.floor(workedMs / closed / 3600000)}h ${String(Math.round(workedMs / closed / 60000) % 60).padStart(2, "0")}m` : "—" },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={query.isPending}
        error={query.error}
        filters={[
          {
            key: "staff",
            label: "Staff",
            options: staff.map((row) => ({ value: String(row.user_number), label: `${row.name} (${row.role.replace("_", " ")})` })),
          },
          { key: "status", label: "Status", options: [{ value: "clock_in", label: "On duty" }, { value: "clock_out", label: "Clocked out" }] },
        ]}
        dateRange={{ value: (row) => row.opening_at }}
        server={{ total: query.data?.pagination?.total || 0, onChange: setTable }}
        emptyText="No clock-ins yet."
      />

      <Modal open={Boolean(clocking)} onClose={() => setClocking(null)} size="md">
        {clocking ? (
          <ModalCard as="form" title="Clock in" onClose={() => setClocking(null)} onSubmit={submitClockIn}>
            <StaffLocationFields value={clocking} onChange={setClocking} />
            <div className="mt-3 max-w-xs">
              <Input label="Clock in time" type="datetime-local" required value={clocking.at} onChange={(e) => setClocking({ ...clocking, at: e.target.value })} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Clock out from the session's row in the table.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setClocking(null)}>Cancel</Button>
              <Button type="submit" disabled={clockIn.isPending}>{clockIn.isPending ? "Saving…" : "Clock in"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>

      <Modal open={Boolean(leaving)} onClose={() => setLeaving(null)} size="md">
        {leaving ? (
          <ModalCard as="form" title={`Clock out ${leaving.row.staff?.name || ""}`} onClose={() => setLeaving(null)} onSubmit={submitClockOut}>
            <p className="text-sm text-slate-600">Clocked in {formatDateTime(leaving.row.opening_at)}.</p>
            <div className="mt-3 max-w-xs">
              <Input label="Clock out time" type="datetime-local" required value={leaving.at} onChange={(e) => setLeaving({ ...leaving, at: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setLeaving(null)}>Cancel</Button>
              <Button type="submit" disabled={clockOut.isPending}>{clockOut.isPending ? "Saving…" : "Clock out"}</Button>
            </div>
          </ModalCard>
        ) : null}
      </Modal>
    </section>
  )
}
