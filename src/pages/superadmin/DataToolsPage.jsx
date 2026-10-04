import { useState } from "react"
import { useDataModulesQuery, useWipeDataModule } from "../../features/settings/settingsQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Modal } from "../../ui/Modal.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"

/** Destructive platform tools. Every wipe needs the module name typed back. */
export function DataToolsPage() {
  const { toast } = useToast()
  const modulesQuery = useDataModulesQuery()
  const wipe = useWipeDataModule()
  const [target, setTarget] = useState(null)
  const [typed, setTyped] = useState("")
  const rows = modulesQuery.data || []

  async function confirmWipe(event) {
    event.preventDefault()
    if (typed !== `delete ${target.name}`) return
    try {
      await wipe.mutateAsync(target.name)
      toast(`${target.name} data deleted`)
      setTarget(null)
      setTyped("")
    } catch (err) {
      toast(err.message, "error")
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Danger zone</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Data tools</h1>
        <p className="mt-1 text-sm text-slate-500">Permanently deletes every row of a module across all stores. This cannot be undone.</p>
      </div>
      {modulesQuery.isPending ? <PageLoader label="Loading modules…" /> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.name} className="rounded-[24px] border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">
              {row.table}
              {row.cascade?.length ? ` + ${row.cascade.join(", ")}` : ""}
            </p>
            <Button variant="danger" className="mt-3" onClick={() => { setTarget(row); setTyped("") }}>Delete all</Button>
          </article>
        ))}
      </div>

      <Modal open={Boolean(target)} onClose={() => setTarget(null)}>
        {target ? (
          <form onSubmit={confirmWipe} className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Delete all {target.name}?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Type <span className="font-mono text-rose-700">delete {target.name}</span> to confirm.
            </p>
            <Input className="mt-4" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={typed !== `delete ${target.name}` || wipe.isPending}>Delete</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  )
}
