import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { usePlansQuery, useSaveStore, useStoreQuery } from "../../features/admin/adminQuery.js"
import { StoreStepper } from "../../features/stores/StoreStepper.jsx"
import { emptyStoreForm, storeFormPayload, storeToForm } from "../../features/stores/storeForm.js"
import { PageLoader } from "../../ui/Spinner.jsx"
import { useToast } from "../../ui/Toast.jsx"

export function StoreFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { toast } = useToast()
  const plansQuery = usePlansQuery()
  const storeQuery = useStoreQuery(id, { enabled: isEdit })
  const saveStore = useSaveStore()
  const [form, setForm] = useState(emptyStoreForm())
  const [error, setError] = useState("")
  const allPlans = plansQuery.data || []
  const activePlans = allPlans.filter((plan) => plan.is_active)
  const store = storeQuery.data
  const plans =
    store?.plan && !activePlans.some((plan) => plan.id === store.plan.id)
      ? [store.plan, ...(activePlans.length ? activePlans : allPlans)]
      : activePlans.length
        ? activePlans
        : allPlans
  const loading = plansQuery.isPending || (isEdit && storeQuery.isPending)

  useEffect(() => {
    if (store) setForm(storeToForm(store))
  }, [store])

  async function submit() {
    setError("")
    try {
      await saveStore.mutateAsync({
        id: isEdit ? id : undefined,
        body: storeFormPayload(form, { isEdit }),
      })
      toast(isEdit ? "Store updated" : "Store registered")
      navigate("/stores")
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <PageLoader label={isEdit ? "Loading store…" : "Loading form…"} />
  }

  return (
    <section className="max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Super Admin
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {isEdit ? "Edit store" : "Register store"}
      </h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">
        {isEdit
          ? "Update the same fields collected at registration. Passwords stay unchanged if left blank."
          : "Create a merchant with first location, Store Admin, Store Manager, and billing."}
      </p>
      <StoreStepper
        mode={isEdit ? "edit" : "add"}
        form={form}
        onChange={setForm}
        plans={plans}
        submitting={saveStore.isPending}
        error={error || plansQuery.error?.message || storeQuery.error?.message || ""}
        onSubmit={submit}
      />
    </section>
  )
}
