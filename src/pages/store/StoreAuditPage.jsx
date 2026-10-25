import { useMemo, useState } from "react"
import { AUDIT_ACTIONS } from "../../features/audit/AuditLogsTable.jsx"
import { useAuditLogsQuery } from "../../features/people/peopleQuery.js"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { DataTable, optionsFrom } from "../../ui/DataTable.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { formatDateTime } from "../../ui/format.js"

const label = (value) => String(value || "").replaceAll("_", " ")

function Json({ value }) {
  if (value === null || value === undefined) return <p className="text-sm text-slate-400">—</p>
  return (
    <pre className="max-h-72 overflow-auto rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

/** Every field of one audit entry, with the data before and after the change. */
function AuditDetail({ row, locationName, onClose }) {
  const fields = [
    ["When", formatDateTime(row.created_at)],
    ["Action", label(row.action)],
    ["By", row.user_name ? `${row.user_name}${row.user_email ? ` (${row.user_email})` : ""}` : row.actor_type || "System"],
    ["Actor type", row.actor_type || "—"],
    ["Record", `${label(row.entity_type) || "—"}${row.entity_id ? ` · ${row.entity_id}` : ""}`],
    ["Location", row.location_name || (row.location_id ? locationName(row.location_id) : "—")],
    ["Channel", row.channel || "—"],
    ["Device", row.device_id || "—"],
    ["IP address", row.ip_address || "—"],
    ["Browser / app", row.user_agent || "—"],
    ["Note", row.note || "—"],
  ]
  return (
    <ModalCard title={`Audit · ${label(row.action)}`} onClose={onClose} className="w-full max-w-3xl">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {fields.map(([name, value]) => (
          <div key={name} className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{name}</dt>
            <dd className="mt-0.5 break-words text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Before</h3>
          <Json value={row.before_data} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">After</h3>
          <Json value={row.after_data} />
        </div>
      </div>
    </ModalCard>
  )
}

/** Audit Logs: who did what, where and when — click a row for every detail. */
export function StoreAuditPage() {
  const { params, isAll } = useDashboardLocation()
  const locationName = useLocationName()
  const [open, setOpen] = useState(null)
  // The latest 500 entries for the chosen location(s); the table searches and filters them.
  const auditQuery = useAuditLogsQuery({ ...params, limit: 500 })
  const rows = useMemo(() => auditQuery.data || [], [auditQuery.data])

  const columns = [
    { key: "created_at", header: "When", sortValue: (row) => new Date(row.created_at), render: (row) => formatDateTime(row.created_at) },
    {
      key: "user",
      header: "By",
      sortValue: (row) => row.user_name,
      render: (row) => (
        <div className="min-w-36 text-xs">
          <p className="font-medium text-slate-900">{row.user_name || label(row.actor_type) || "System"}</p>
          <p className="text-slate-500">{row.user_email || ""}</p>
        </div>
      ),
    },
    { key: "action", header: "Action", render: (row) => <StatusBadge value={row.action} /> },
    {
      key: "entity",
      header: "Record",
      sortValue: (row) => row.entity_type,
      render: (row) => (
        <div className="text-xs">
          <p className="capitalize text-slate-900">{label(row.entity_type) || "—"}</p>
          <p className="max-w-40 truncate font-mono text-slate-400">{row.entity_id || ""}</p>
        </div>
      ),
    },
    ...(isAll ? [{ key: "location", header: "Location", sortValue: (row) => row.location_name, render: (row) => row.location_name || (row.location_id ? locationName(row.location_id) : "—") }] : []),
    { key: "channel", header: "Channel", render: (row) => (row.channel ? <StatusBadge value={row.channel} /> : "—") },
    { key: "ip_address", header: "IP", render: (row) => <span className="font-mono text-xs">{row.ip_address || "—"}</span> },
    { key: "note", header: "Note", sortable: false, className: "max-w-56 truncate", render: (row) => row.note || "—" },
    { key: "changes", header: "Changes", sortable: false, render: (row) => (row.before_data || row.after_data ? <span className="text-xs font-semibold text-brand-700">View</span> : "—") },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Audit Logs"
        title="Audit Logs"
        description="Every action in the store — sign-ins, sales, refunds, stock, staff and settings changes — with who did it, where and from which device. Click a row for all its details and the data before and after."
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={auditQuery.isPending}
        error={auditQuery.error}
        search={{
          placeholder: "Search user, record, note or IP…",
          text: (row) => `${row.user_name || ""} ${row.user_email || ""} ${row.entity_type || ""} ${row.entity_id || ""} ${row.note || ""} ${row.ip_address || ""}`,
        }}
        filters={[
          { key: "action", label: "Action", options: AUDIT_ACTIONS.map((value) => ({ value, label: label(value) })) },
          { key: "entity_type", label: "Record", options: optionsFrom(rows, (row) => row.entity_type, (value) => label(value)) },
          { key: "user", label: "By", options: optionsFrom(rows, (row) => row.user_id, (id, row) => row.user_name || id), match: (row, value) => row.user_id === value },
          { key: "channel", label: "Channel", options: optionsFrom(rows, (row) => row.channel) },
        ]}
        dateRange={{ value: (row) => row.created_at }}
        initialSort={{ key: "created_at", dir: "desc" }}
        onRowClick={setOpen}
        emptyText="No audit entries yet."
      />
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} size="xl">
        {open ? <AuditDetail row={open} locationName={locationName} onClose={() => setOpen(null)} /> : null}
      </Modal>
    </section>
  )
}
