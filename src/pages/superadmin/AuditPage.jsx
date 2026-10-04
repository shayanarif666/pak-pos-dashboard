import { useMemo, useState } from "react"
import {
  useAdminAuditLogsQuery,
  useStoresQuery,
} from "../../features/admin/adminQuery.js"
import { AUDIT_ACTIONS, AuditLogsTable } from "../../features/audit/AuditLogsTable.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"

export function AuditPage() {
  const [storeId, setStoreId] = useState("")
  const [action, setAction] = useState("")
  const [entityType, setEntityType] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const filters = useMemo(
    () => ({
      store_id: storeId || undefined,
      action: action || undefined,
      entity_type: entityType.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
      limit: 200,
    }),
    [storeId, action, entityType, from, to]
  )

  const storesQuery = useStoresQuery()
  const auditQuery = useAdminAuditLogsQuery(filters)
  const stores = storesQuery.data || []
  const rows = auditQuery.data || []

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Super Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Platform audit</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete audit trail across all stores. Sensitive fields are redacted.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select label="Store" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">All stores</option>
          {stores.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <Select label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </Select>
        <Input
          label="Entity type"
          placeholder="orders, licenses…"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {auditQuery.isPending || storesQuery.isPending ? (
        <PageLoader label="Loading platform audit…" />
      ) : null}
      {auditQuery.error ? (
        <p className="text-sm text-rose-700">{auditQuery.error.message}</p>
      ) : null}

      <AuditLogsTable
        rows={rows}
        loading={auditQuery.isPending}
        showStore
        empty="No platform audit entries."
      />
    </section>
  )
}
