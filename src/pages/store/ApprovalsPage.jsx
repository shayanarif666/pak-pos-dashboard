import { useMemo, useState } from "react"
import { KeyRound } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useApprovalRequestsQuery,
  usePinOverride,
  useReviewApproval,
  useStoreLocationsQuery,
} from "../../features/people/peopleQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal, ModalCard } from "../../ui/Modal.jsx"
import { Input, Textarea } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { StatusBadge } from "../../ui/Pill.jsx"

const APPROVAL_TYPES = [
  "void_order",
  "cancel_order",
  "pin_override",
  "stock_adjustment",
  "discount_override",
]

const emptyOverride = {
  pin: "",
  type: "pin_override",
  location_id: "",
  reason: "",
}

export function ApprovalsPage() {
  const { user, location, store } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState("pending")
  const [typeFilter, setTypeFilter] = useState("")
  const filters = useMemo(
    () => ({
      status: status || undefined,
      type: typeFilter || undefined,
    }),
    [status, typeFilter]
  )
  const approvalsQuery = useApprovalRequestsQuery(filters)
  const locationsQuery = useStoreLocationsQuery()
  const reviewApproval = useReviewApproval()
  const overrideMutation = usePinOverride()
  const rows = approvalsQuery.data || []
  const locations = locationsQuery.data || []
  const locationName = useMemo(
    () => Object.fromEntries(locations.map((row) => [row.id, row.name])),
    [locations]
  )

  const [overrideForm, setOverrideForm] = useState({
    ...emptyOverride,
    location_id: location?.id || "",
  })
  const [reviewPin, setReviewPin] = useState("")
  const [reviewNote, setReviewNote] = useState("")
  const [busyId, setBusyId] = useState(null)
  const [showOverride, setShowOverride] = useState(false)
  const [error, setError] = useState("")

  async function decide(row, nextStatus) {
    setBusyId(row.id)
    setError("")
    try {
      await reviewApproval.mutateAsync({
        id: row.id,
        body: {
          status: nextStatus,
          review_note: reviewNote.trim() || null,
          pin: reviewPin.trim() || null,
        },
      })
      toast(nextStatus === "approved" ? "Request approved" : "Request rejected")
      setReviewNote("")
      setReviewPin("")
    } catch (err) {
      setError(err.message)
      toast(err.message, "error")
    } finally {
      setBusyId(null)
    }
  }

  async function submitOverride(event) {
    event.preventDefault()
    setError("")
    try {
      await overrideMutation.mutateAsync({
        pin: overrideForm.pin.trim(),
        type: overrideForm.type,
        location_id: overrideForm.location_id || location?.id,
        reason: overrideForm.reason.trim() || null,
      })
      toast("PIN override recorded")
      setOverrideForm({
        ...emptyOverride,
        location_id: location?.id || locations.find((row) => row.is_default)?.id || "",
      })
      setShowOverride(false)
    } catch (err) {
      setError(err.message)
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            {store?.name ? `${store.name} · ` : ""}
            Review pending void / discount / stock requests, or record a PIN override.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setShowOverride(true)}>
          <KeyRound className="h-4 w-4" />
          PIN override
        </Button>
      </div>

      <Modal open={showOverride} onClose={() => setShowOverride(false)} size="md">
        <ModalCard as="form" title="PIN override" onClose={() => setShowOverride(false)} onSubmit={submitOverride} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Manager / admin PIN"
              type="password"
              required
              maxLength={6}
              value={overrideForm.pin}
              onChange={(e) => setOverrideForm({ ...overrideForm, pin: e.target.value })}
            />
            <Select
              label="Type"
              value={overrideForm.type}
              onChange={(e) => setOverrideForm({ ...overrideForm, type: e.target.value })}
            >
              {APPROVAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            {user?.role === "store_admin" ? (
              <Select
                label="Location"
                required
                value={overrideForm.location_id}
                onChange={(e) =>
                  setOverrideForm({ ...overrideForm, location_id: e.target.value })
                }
              >
                <option value="">Select location</option>
                {locations.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <Textarea
              className="sm:col-span-2"
              label="Reason"
              value={overrideForm.reason}
              onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={overrideMutation.isPending}>
            {overrideMutation.isPending ? "Recording…" : "Record override"}
          </Button>
        </ModalCard>
      </Modal>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {APPROVAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {approvalsQuery.isPending ? <PageLoader label="Loading approvals…" /> : null}
      {approvalsQuery.error ? (
        <p className="text-sm text-rose-700">{approvalsQuery.error.message}</p>
      ) : null}

      {status === "pending" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Review PIN (optional)"
            type="password"
            maxLength={6}
            value={reviewPin}
            onChange={(e) => setReviewPin(e.target.value)}
          />
          <Input
            label="Review note"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </div>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-[24px] border border-slate-200 bg-white px-5 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium capitalize text-slate-900">
                    {String(row.type || "").replaceAll("_", " ")}
                  </p>
                  <StatusBadge value={row.status} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {locationName[row.location_id] || "Location"} ·{" "}
                  {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                </p>
                {row.reason ? <p className="mt-2 text-sm text-slate-700">{row.reason}</p> : null}
                {row.review_note ? (
                  <p className="mt-1 text-xs text-slate-500">Note: {row.review_note}</p>
                ) : null}
              </div>
              {row.status === "pending" ? (
                <div className="flex gap-2">
                  <Button
                    disabled={busyId === row.id}
                    onClick={() => decide(row, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busyId === row.id}
                    onClick={() => decide(row, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {!approvalsQuery.isPending && !rows.length ? (
          <p className="rounded-[24px] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
            No {status || ""} approval requests.
          </p>
        ) : null}
      </div>
    </section>
  )
}
