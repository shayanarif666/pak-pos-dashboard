import { useEffect, useState } from "react"
import { Check, RotateCcw, SlidersHorizontal } from "lucide-react"
import { useCategoriesQuery, useProductsQuery } from "../catalog/catalogQuery.jsx"
import { useSuppliersQuery } from "../inventory/inventoryQuery.js"
import { useStaffQuery } from "../operations/operationsQuery.js"
import { humanize } from "../../lib/exportFile.js"
import { Button } from "../../ui/Button.jsx"
import { Input } from "../../ui/Input.jsx"
import { Select } from "../../ui/Select.jsx"
import { PAYMENT_METHOD_LABEL } from "../../ui/format.js"

/*
 * The filters of one report. They come from the API (GET /reporting: every card carries its
 * `filters` — name, label, type, values, default, kind), so a filter added to the API shows up here
 * by itself. Nothing is sent while a filter is being chosen: the choices wait in a draft and go
 * to GET /reporting/:section as query parameters when "Apply filters" is pressed.
 *
 *   type enum    a drop-down of its values        type boolean  Any / Yes / No
 *   type text    a text box                       type number   a number box
 *   type ref     a drop-down of staff, categories, suppliers or products (kind), or a batch number
 */

const PAYMENT_NAMES = new Set(["payment_method", "method", "refund_method"])

function optionLabel(filter, value) {
  if (PAYMENT_NAMES.has(filter.name)) return PAYMENT_METHOD_LABEL[value] || humanize(value)
  return humanize(value)
}

const rowsOf = (query) => query.data || []

function StaffSelect({ label, value, onChange }) {
  const query = useStaffQuery()
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Anyone</option>
      {rowsOf(query).map((row) => <option key={row.id} value={row.id}>{row.name}{row.role ? ` (${humanize(row.role)})` : ""}</option>)}
    </Select>
  )
}

function CategorySelect({ label, value, onChange }) {
  const query = useCategoriesQuery()
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Every category</option>
      {rowsOf(query).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
    </Select>
  )
}

function SupplierSelect({ label, value, onChange }) {
  const query = useSuppliersQuery()
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Every supplier</option>
      {rowsOf(query).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
    </Select>
  )
}

function ProductSelect({ label, value, onChange }) {
  const query = useProductsQuery()
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Every product</option>
      {rowsOf(query).map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
    </Select>
  )
}

/** The variants of the product picked in product_id (nothing when it has none). */
function VariantSelect({ label, productId, value, onChange }) {
  const query = useProductsQuery()
  const product = rowsOf(query).find((row) => row.id === productId)
  const variants = product?.variants || []
  if (!variants.length) return null
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Every variant</option>
      {variants.map((row) => <option key={row.id} value={row.id}>{row.name || row.variant_name || row.title}</option>)}
    </Select>
  )
}

function Control({ filter, values, patch }) {
  const value = values[filter.name] ?? ""
  const onChange = (next) => patch({ [filter.name]: next })
  const label = filter.label || humanize(filter.name)

  if (filter.type === "enum") {
    const placeholder = filter.default ? `Default (${optionLabel(filter, filter.default)})` : "Any"
    return (
      <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {filter.values.map((option) => <option key={option} value={option}>{optionLabel(filter, option)}</option>)}
      </Select>
    )
  }
  if (filter.type === "boolean") {
    return (
      <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{filter.default === true ? "Yes (default)" : "Any"}</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </Select>
    )
  }
  if (filter.type === "number") return <Input label={label} type="number" min="0" value={value} placeholder="Any" onChange={(e) => onChange(e.target.value)} />
  if (filter.type === "ref") {
    if (filter.kind === "staff") return <StaffSelect label={label} value={value} onChange={onChange} />
    if (filter.kind === "category") return <CategorySelect label={label} value={value} onChange={onChange} />
    if (filter.kind === "supplier") return <SupplierSelect label={label} value={value} onChange={onChange} />
    if (filter.kind === "product") return <ProductSelect label={label} value={value} onChange={(next) => patch({ product_id: next, variant_id: "" })} />
    if (filter.kind === "variant") return <VariantSelect label={label} productId={values.product_id} value={value} onChange={onChange} />
    return <Input label={label} value={value} placeholder="Number" onChange={(e) => onChange(e.target.value.trim())} />
  }
  return <Input label={label} value={value} placeholder="Any" onChange={(e) => onChange(e.target.value)} />
}

/** The values that are set (an empty box is not sent). */
export function activeFilters(values) {
  return Object.fromEntries(Object.entries(values || {}).filter(([, value]) => value !== "" && value != null && String(value).trim() !== ""))
}

const sameFilters = (a, b) => {
  const left = Object.entries(activeFilters(a)).sort(([x], [y]) => x.localeCompare(y))
  const right = Object.entries(activeFilters(b)).sort(([x], [y]) => x.localeCompare(y))
  return JSON.stringify(left) === JSON.stringify(right)
}

/**
 * values = the filters now applied to the report; onChange(values) applies new ones. The boxes
 * hold a draft until Apply filters (or Enter in a text box); Clear filters empties and applies.
 */
export function ReportFilters({ filters, values, onChange }) {
  const [draft, setDraft] = useState(values)
  // The applied filters changed from outside (another report, a clear): the boxes follow.
  useEffect(() => setDraft(values), [values])
  if (!filters?.length) return null

  const patch = (change) => setDraft((current) => ({ ...current, ...change }))
  const applied = Object.keys(activeFilters(values)).length
  const dirty = !sameFilters(draft, values)
  const anything = applied > 0 || Object.keys(activeFilters(draft)).length > 0

  function apply(event) {
    event?.preventDefault()
    onChange(activeFilters(draft))
  }
  function clear() {
    setDraft({})
    onChange({})
  }

  return (
    <form onSubmit={apply} className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-brand-700" />
          Filters
          {applied ? <span title="Filters applied" className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">{applied}</span> : null}
          {dirty ? <span className="text-xs font-medium text-amber-700">Not applied yet</span> : null}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filters.map((filter) => <Control key={filter.name} filter={filter} values={draft} patch={patch} />)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {anything ? (
          <Button variant="ghost" type="button" className="h-10 px-4 text-sm" onClick={clear}>
            <RotateCcw className="h-4 w-4" /> Clear filters
          </Button>
        ) : null}
        <Button type="submit" className="h-10 px-5 text-sm" disabled={!dirty}>
          <Check className="h-4 w-4" /> Apply filters
        </Button>
      </div>
    </form>
  )
}
