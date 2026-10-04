import { useEffect, useState } from "react"
import { useSaveTaxRates, useTaxRatesQuery } from "../../features/tax/taxQuery.js"
import { Button } from "../../ui/Button.jsx"
import { Checkbox } from "../../ui/Checkbox.jsx"
import { Input } from "../../ui/Input.jsx"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"

const PAYMENT_METHODS = ["cash", "card", "jazzcash", "easypaisa", "cod"]

function emptyRates() {
  return PAYMENT_METHODS.map((payment_method) => ({
    payment_method,
    gst_percent: "0",
  }))
}

export function TaxPage() {
  const { toast } = useToast()
  const taxQuery = useTaxRatesQuery()
  const saveTax = useSaveTaxRates()
  const [ntn, setNtn] = useState("")
  const [strn, setStrn] = useState("")
  const [defaultTaxRate, setDefaultTaxRate] = useState("")
  const [chargeTax, setChargeTax] = useState(true)
  const [fbrEnabled, setFbrEnabled] = useState(false)
  const [rates, setRates] = useState(emptyRates())
  const [error, setError] = useState("")

  useEffect(() => {
    const data = taxQuery.data
    if (!data) return
    setNtn(data.ntn || "")
    setStrn(data.strn || "")
    setDefaultTaxRate(
      data.default_tax_rate == null || data.default_tax_rate === ""
        ? ""
        : String(data.default_tax_rate)
    )
    setChargeTax(Boolean(data.charge_tax_on_sales))
    setFbrEnabled(Boolean(data.fbr_invoice_enabled))
    const byMethod = new Map((data.rates || []).map((row) => [row.payment_method, row]))
    setRates(
      PAYMENT_METHODS.map((payment_method) => ({
        payment_method,
        gst_percent: String(byMethod.get(payment_method)?.gst_percent ?? 0),
      }))
    )
  }, [taxQuery.data])

  function setRateValue(method, value) {
    setRates((rows) =>
      rows.map((row) =>
        row.payment_method === method ? { ...row, gst_percent: value } : row
      )
    )
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError("")
    try {
      await saveTax.mutateAsync({
        ntn: ntn.trim() || null,
        strn: strn.trim() || null,
        charge_tax_on_sales: chargeTax,
        fbr_invoice_enabled: fbrEnabled,
        default_tax_rate: defaultTaxRate === "" ? null : Number(defaultTaxRate),
        rates: rates.map((row) => ({
          payment_method: row.payment_method,
          gst_percent: Number(row.gst_percent),
        })),
      })
      toast("Tax & FBR settings saved")
    } catch (err) {
      setError(err.message)
      toast(err.message, "error")
    }
  }

  if (taxQuery.isPending) return <PageLoader label="Loading tax settings…" />

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Tax & FBR</h1>
        <p className="mt-1 text-sm text-slate-500">
          Store tax flags, default rate, NTN/STRN, and GST percent per payment method.
        </p>
      </div>

      {taxQuery.error ? (
        <p className="text-sm text-rose-700">{taxQuery.error.message}</p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="NTN" value={ntn} onChange={(e) => setNtn(e.target.value)} />
          <Input label="STRN" value={strn} onChange={(e) => setStrn(e.target.value)} />
          <Input
            label="Default tax rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={defaultTaxRate}
            onChange={(e) => setDefaultTaxRate(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
            <Checkbox
              label="Charge tax on sales"
              checked={chargeTax}
              onChange={(e) => setChargeTax(e.target.checked)}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
            <Checkbox
              label="FBR invoice enabled"
              checked={fbrEnabled}
              onChange={(e) => setFbrEnabled(e.target.checked)}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">GST by payment method</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {rates.map((row) => (
              <Input
                key={row.payment_method}
                label={`${row.payment_method.toUpperCase()} GST %`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={row.gst_percent}
                onChange={(e) => setRateValue(row.payment_method, e.target.value)}
              />
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={saveTax.isPending}>
          {saveTax.isPending ? "Saving…" : "Save tax settings"}
        </Button>
      </form>
    </section>
  )
}
