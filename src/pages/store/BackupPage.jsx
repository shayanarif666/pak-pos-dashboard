import { useState } from "react"
import { PageHeader } from "../../ui/PageHeader.jsx"
import { useBackupsQuery, useCreateBackup, useRestoreBackup } from "../../features/settings/settingsQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"

export function BackupPage() {
  const { toast, confirmToast } = useToast()
  const backupsQuery = useBackupsQuery()
  const createBackup = useCreateBackup()
  const restoreBackup = useRestoreBackup()
  const [note, setNote] = useState("")
  const rows = backupsQuery.data || []

  async function create(event) {
    event.preventDefault()
    try {
      await createBackup.mutateAsync({ note: note.trim() || null })
      setNote("")
      toast("Backup created")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  async function restore(row) {
    const ok = await confirmToast({
      title: "Restore this backup?",
      message: `Store data will be replaced with the backup from ${new Date(row.created_at).toLocaleString()}.`,
      confirmLabel: "Restore",
    })
    if (!ok) return
    try {
      await restoreBackup.mutateAsync(row.id)
      toast("Backup restored")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        section="Admin"
        title="Backup &amp; restore"
        description="Available on packages with backup enabled."
      />
      <form onSubmit={create} className="flex max-w-xl items-end gap-3">
        <Input className="flex-1" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button type="submit" disabled={createBackup.isPending}>Back up now</Button>
      </form>
      {backupsQuery.isPending ? <PageLoader label="Loading backups…" /> : null}
      {backupsQuery.error ? <p className="text-sm text-rose-700">{backupsQuery.error.message}</p> : null}
      <ul className="max-w-2xl divide-y divide-slate-200 rounded-[24px] border border-slate-200">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-700">
            <span>
              {new Date(row.created_at).toLocaleString()}
              {row.note ? ` · ${row.note}` : ""}
            </span>
            <Button variant="ghost" onClick={() => restore(row)} disabled={restoreBackup.isPending}>Restore</Button>
          </li>
        ))}
        {!backupsQuery.isPending && !backupsQuery.error && !rows.length ? (
          <li className="px-4 py-6 text-sm text-slate-500">No backups yet.</li>
        ) : null}
      </ul>
    </section>
  )
}
