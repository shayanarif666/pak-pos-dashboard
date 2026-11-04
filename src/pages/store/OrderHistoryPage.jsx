import { useState } from "react"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { Tabs, useTabParam } from "../../ui/Tabs.jsx"
import { LocationSalesSummary, LocationSelect } from "../../features/orders/LocationSales.jsx"
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
  // One branch filter for every history tab (store admin); managers only see their own branch.
  const [locationId, setLocationId] = useState("")

  return (
    <section className="space-y-6">
      <PageHeader
        section="Sales"
        title="Order history"
        description="Orders grouped by where they ended up."
        actions={<>
          <LocationSelect className="min-w-56" value={locationId} onChange={setLocationId} />
        </>}
      />
      <LocationSalesSummary selected={locationId} onSelect={setLocationId} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "completed" ? <OrdersPage key="completed" status="completed" embedded locationId={locationId} /> : null}
      {tab === "pending" ? <OrdersPage key="pending" status="pending" embedded locationId={locationId} /> : null}
      {tab === "cancelled" ? <OrdersPage key="cancelled" mode="cancelled" embedded locationId={locationId} /> : null}
      {tab === "refunded" ? <OrdersPage key="refunded" status="refunded" embedded locationId={locationId} /> : null}
      {tab === "refunds" ? <RefundsPage embedded locationId={locationId} /> : null}
    </section>
  )
}
