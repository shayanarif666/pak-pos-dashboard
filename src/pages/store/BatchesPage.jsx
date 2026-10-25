import { useMemo } from "react"
import { useBatchesQuery } from "../../features/lists/listQueries.js"
import { useDashboardLocation, useLocationName } from "../../features/scope/DashboardLocation.jsx"
import { useStaffNames } from "../../features/lists/useStaffNames.js"
import { DataTable, optionsFrom } from "../../ui/DataTable.jsx"
import { Currency } from "../../ui/Currency.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { formatDateTime, toNumber } from "../../ui/format.js"

/** Batch History: every cash drawer batch — opening cash, takings per method, counted cash, variance. */
export function BatchesPage() {
  const { params, isAll } = useDashboardLocation()
  const locationName = useLocationName()
  const staffName = useStaffNames()
  const query = useBatchesQuery(params)
  const rows = useMemo(() => query.data || [], [query.data])

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
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Staff"
        title="Batch History"
        description="Cash drawer batches opened and closed on the POS: takings per payment method, the cash expected in the drawer, what was counted and the difference."
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
    </section>
  )
}
