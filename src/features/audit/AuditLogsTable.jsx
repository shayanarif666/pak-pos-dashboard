import { Fragment, useState } from "react"
import { StatusBadge } from "../../ui/Pill.jsx"


export const AUDIT_ACTIONS = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "clock_in",
  "clock_out",
  "sale",
  "void",
  "cancel",
  "refund",
  "pin_override",
  "approve",
  "reject",
  "license_activate",
  "backup",
  "restore",
]

function formatJson(value) {
  if (value == null) return "—"
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function AuditLogsTable({
  rows = [],
  loading = false,
  empty = "No audit entries.",
  showStore = false,
}) {
  const [openId, setOpenId] = useState(null)

  if (loading) return null
  if (!rows.length) {
    return (
      <p className="rounded-[24px] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
        {empty}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[24px] border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th className="px-4 py-3">When</th>
            {showStore ? <th className="px-4 py-3">Store</th> : null}
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = openId === row.id
            const colSpan = showStore ? 8 : 7
            return (
              <Fragment key={row.id}>
                <tr
                  className="cursor-pointer border-b border-slate-200 align-top hover:bg-brand-50"
                  onClick={() => setOpenId(open ? null : row.id)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </td>
                  {showStore ? (
                    <td className="px-4 py-3 text-slate-800">
                      <div>{row.store_name || "—"}</div>
                      {row.store_number != null ? (
                        <div className="font-mono text-xs text-slate-500">#{row.store_number}</div>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <StatusBadge value={row.action} />
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    <div>{row.entity_type || "—"}</div>
                    <div className="font-mono text-xs text-slate-500">{row.entity_id || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{row.user_name || row.actor_type || "—"}</div>
                    <div className="text-xs text-slate-500">
                      {row.user_email || row.ip_address || ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.location_name ||
                      (row.location_number != null ? `#${row.location_number}` : "—")}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.channel || "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{row.note || "—"}</td>
                </tr>
                {open ? (
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <td colSpan={colSpan} className="px-4 py-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Before (redacted)
                          </p>
                          <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-3 text-xs text-slate-700">
                            {formatJson(row.before_data)}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            After (redacted)
                          </p>
                          <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-3 text-xs text-slate-700">
                            {formatJson(row.after_data)}
                          </pre>
                        </div>
                      </div>
                      {row.user_agent ? (
                        <p className="mt-3 text-xs text-slate-500">{row.user_agent}</p>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
