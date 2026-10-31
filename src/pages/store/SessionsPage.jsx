import { useState } from "react"
import { useStaffSessionsQuery } from "../../features/lists/listQueries.js"
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
  const { params: locationParams, isAll } = useDashboardLocation()
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
    { key: "staff", header: "Staff", render: (row) => staffName(row.staffId) },
    ...(isAll ? [{ key: "locationId", header: "Location", render: (row) => locationName(row.locationId) }] : []),
    { key: "opening_at", header: "Clock in", render: (row) => formatDateTime(row.opening_at) },
    { key: "closing_at", header: "Clock out", render: (row) => formatDateTime(row.closing_at) },
    { key: "duration", header: "Worked", render: (row) => duration(row.opening_at, row.closing_at) },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
  ]

  return (
    <section className="space-y-6">
      <PageHeader section="Staff" title="Sessions History" description="When each staff member clocked in and out on the POS, and how long they worked." />
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
    </section>
  )
}
