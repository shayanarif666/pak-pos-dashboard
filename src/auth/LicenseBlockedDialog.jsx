import { useState } from "react"
import { ShieldAlert } from "lucide-react"
import { Modal } from "../ui/Modal.jsx"
import { Button } from "../ui/Button.jsx"

const TITLES = {
  LICENSE_EXPIRED: "License expired",
  LICENSE_SUSPENDED: "License suspended",
}

/**
 * Shown when the API reports the store license as expired or suspended. It cannot be dismissed
 * (no close button, Escape or backdrop click); OK is the only action and it signs the user out.
 */
export function LicenseBlockedDialog({ block, onConfirm }) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={Boolean(block)} size="sm" labelledBy="license-blocked-title">
      {block ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 id="license-blocked-title" className="mt-4 text-lg font-semibold text-slate-900">
            {TITLES[block.code] || "License unavailable"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{block.message}</p>
          <Button className="mt-6 w-full" disabled={busy} onClick={confirm} autoFocus>
            OK
          </Button>
        </div>
      ) : null}
    </Modal>
  )
}
