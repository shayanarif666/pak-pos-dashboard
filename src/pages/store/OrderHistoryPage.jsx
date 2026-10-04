import { Tabs, useTabParam } from "../../ui/Tabs.jsx"
import { OrdersPage } from "./OrdersPage.jsx"
import { RefundsPage } from "./RefundsPage.jsx"

// Web orders become "completed" once their payment is confirmed on delivery, so
// completed and delivered share one tab (there is no separate delivered status).
const TABS = [
  ["completed", "Completed / delivered"],
  ["pending", "Pending"],
  ["cancelled", "Cancelled & voided"],
  ["refunded", "Refunded orders"],
  ["refunds", "Refund records"],
]

export function OrderHistoryPage() {
  const [tab, setTab] = useTabParam(TABS)

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Order history</h1>
        <p className="mt-1 text-sm text-slate-500">Orders grouped by where they ended up.</p>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "completed" ? <OrdersPage key="completed" status="completed" embedded /> : null}
      {tab === "pending" ? <OrdersPage key="pending" status="pending" embedded /> : null}
      {tab === "cancelled" ? <OrdersPage key="cancelled" mode="cancelled" embedded /> : null}
      {tab === "refunded" ? <OrdersPage key="refunded" status="refunded" embedded /> : null}
      {tab === "refunds" ? <RefundsPage embedded /> : null}
    </section>
  )
}
