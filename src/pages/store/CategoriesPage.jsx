import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useAuth } from "../../auth/AuthContext.jsx"
import {
  useCategoriesQuery,
  useDeleteCategory,
  useLocationsQuery,
  useProductsQuery,
  useSaveCategory,
} from "../../features/catalog/catalogQuery.jsx"
import { Switch } from "../../ui/Switch.jsx"
import { CategoryFormModal } from "../../features/catalog/CategoryFormModal.jsx"
import { LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"

export function CategoriesPage() {
  const navigate = useNavigate()
  const { toast, confirmToast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === "store_admin"
  const locationsQuery = useLocationsQuery({ enabled: isAdmin })
  const locations = (locationsQuery.data || []).filter((row) => row.is_active !== false)
  const categoriesQuery = useCategoriesQuery()
  const deleteCategoryMutation = useDeleteCategory()
  const saveCategory = useSaveCategory()
  const [toggling, setToggling] = useState({})

  async function setActive(row, next) {
    setToggling((current) => ({ ...current, [row.id]: true }))
    try {
      await saveCategory.mutateAsync({ id: row.id, body: { is_active: next } })
      toast(next ? `${row.name} is active` : `${row.name} is switched off`)
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setToggling((current) => ({ ...current, [row.id]: false }))
    }
  }
  const rows = categoriesQuery.data || []
  // null = closed; { category: null } = new; { category: row } = edit.
  const [editing, setEditing] = useState(null)
  const loading = categoriesQuery.isPending
  const productsQuery = useProductsQuery({})
  const productCount = new Map()
  for (const product of productsQuery.data || []) {
    productCount.set(product.category_id, (productCount.get(product.category_id) || 0) + 1)
  }
  const listError = categoriesQuery.error?.message || ""

  const openCreate = () => setEditing({ category: null })
  const openEdit = (row) => setEditing({ category: row })

  async function remove(row) {
    const ok = await confirmToast({
      title: "Delete category?",
      message: `Remove ${row.name}? Products using it cannot stay attached.`,
      confirmLabel: "Delete",
    })
    if (!ok) return
    try {
      await deleteCategoryMutation.mutateAsync(row.id)
      toast("Category deleted")
    } catch (err) {
      toast(err.message, "error")
    }
  }


  const parentName = (id) => rows.find((row) => row.id === id)?.name || "—"
  const percentOrRs = (type, value) =>
    type && value != null && value !== "" ? (type === "percentage" ? `${Number(value)}%` : `Rs ${Number(value)}`) : "—"

  const columns = [
    {
      key: "name",
      header: "Category",
      render: (row) => (
        <div className="flex min-w-44 items-center gap-3">
          {row.image_url ? (
            <img src={row.image_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] text-slate-400">No img</div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">#{row.category_number} · {row.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "parent", header: "Parent", sortValue: (row) => parentName(row.parent_category_id), render: (row) => (row.parent_category_id ? parentName(row.parent_category_id) : "—") },
    { key: "products", header: "Products", align: "right", sortValue: (row) => productCount.get(row.id) || 0, render: (row) => productCount.get(row.id) || 0 },
    { key: "tax", header: "Category tax", sortValue: (row) => Number(row.tax_value || 0), render: (row) => percentOrRs(row.tax_type, row.tax_value) },
    { key: "discount", header: "Discount", sortValue: (row) => Number(row.discount_value || 0), render: (row) => percentOrRs(row.discount_type, row.discount_value) },
    {
      key: "channels",
      header: "Shown on",
      sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          <Pill tone={row.is_pos_visible ? "sky" : "zinc"} dot={false}>POS</Pill>
          <Pill tone={row.is_web_visible ? "fuchsia" : "zinc"} dot={false}>Web</Pill>
        </div>
      ),
    },
    {
      key: "locations",
      header: "Sold at",
      sortValue: (row) => (row.location_scope === "selected" ? (row.locations || []).length : 0),
      render: (row) => <LocationScopePills row={row} />,
    },
    {
      key: "is_active",
      header: "Active",
      sortValue: (row) => (row.is_active ? 1 : 0),
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <Switch
            checked={row.is_active !== false}
            disabled={Boolean(toggling[row.id])}
            label={row.is_active !== false ? `Switch off ${row.name}` : `Switch on ${row.name}`}
            onChange={(next) => setActive(row, next)}
          />
          <Pill tone={row.is_active !== false ? "emerald" : "rose"}>{row.is_active !== false ? "Active" : "Off"}</Pill>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="icon" aria-label="Edit category" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label="Delete category" onClick={() => remove(row)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        section="Catalog"
        title="Categories"
        description="Sold at every location or only the ones you pick. A category tax and discount apply to every product in it."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add category</Button>}
      />
      <StatCards
        items={[
          { label: "Categories", value: rows.length },
          { label: "Active", value: rows.filter((row) => row.is_active !== false).length },
          { label: "Switched off", value: rows.filter((row) => row.is_active === false).length },
          { label: "Products", value: (productsQuery.data || []).length },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={listError ? { message: listError } : null}
        search={{ placeholder: "Search category…", text: (row) => `${row.name} ${row.slug} ${row.category_number}` }}
        filters={[
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "off", label: "Off" }], match: (row, value) => (row.is_active ? "active" : "off") === value },
          ...(isAdmin && locations.length > 1
            ? [{
                key: "location",
                label: "Sold at",
                options: locations.map((row) => ({ value: row.id, label: row.name })),
                match: (row, value) => row.location_scope !== "selected" || (row.location_ids || []).includes(value),
              }]
            : []),
          { key: "tax", label: "Category tax", options: [{ value: "yes", label: "With tax" }, { value: "no", label: "No tax" }], match: (row, value) => (row.tax_type ? "yes" : "no") === value },
        ]}
        dateRange={{ label: "Added on", value: (row) => row.created_at }}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(row) => navigate(`/categories/${row.category_number}`)}
        emptyText="No categories yet. Create one before adding products."
      />

      <CategoryFormModal open={Boolean(editing)} category={editing?.category || null} categories={rows} onClose={() => setEditing(null)} />
    </section>
  )
}
