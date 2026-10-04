import { useState } from "react"
import { Check, X } from "lucide-react"
import {
  useModerateReview,
  useReviewsQuery,
} from "../../features/promotions/promotionQuery.js"
import { Button } from "../../ui/Button.jsx"

import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

export function ReviewsPage() {
  const { toast } = useToast()
  const [status, setStatus] = useState("")
  const [filters, setFilters] = useState({})
  const reviewsQuery = useReviewsQuery(filters)
  const moderateReview = useModerateReview()
  const reviews = reviewsQuery.data || []

  function applyFilters(event) {
    event.preventDefault()
    setFilters({ status })
  }

  async function moderate(row, nextStatus) {
    try {
      await moderateReview.mutateAsync({ id: row.id, status: nextStatus })
      toast(`Review ${nextStatus}`)
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Promotions</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Reviews</h1>
        <p className="mt-1 text-sm text-slate-500">Moderate storefront product reviews before they become public.</p>
      </div>

      <form onSubmit={applyFilters} className="mb-6 grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 md:grid-cols-[220px_auto]">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <div className="flex items-end">
          <Button type="submit" variant="ghost">Filter</Button>
        </div>
      </form>

      {reviewsQuery.isPending ? <PageLoader label="Loading reviews…" /> : null}
      {reviewsQuery.error ? <p className="mb-4 text-sm text-rose-700">{reviewsQuery.error.message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((row) => (
          <article key={row.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{row.product_title || "Product review"}</h2>
                <p className="text-sm text-slate-600">By {row.reviewer_name || "Customer"} · {row.rating}/5</p>
              </div>
              <StatusBadge value={row.status} />
            </div>
            {row.comment ? <p className="mt-4 text-sm leading-6 text-slate-700">{row.comment}</p> : null}
            <p className="mt-3 text-xs text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
            {row.status === "pending" ? (
              <div className="mt-5 flex gap-2">
                <Button onClick={() => moderate(row, "approved")} disabled={moderateReview.isPending}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button variant="danger" onClick={() => moderate(row, "rejected")} disabled={moderateReview.isPending}>
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {!reviewsQuery.isPending && !reviews.length ? (
        <p className="mt-8 text-sm text-slate-500">No reviews found.</p>
      ) : null}
    </section>
  )
}
