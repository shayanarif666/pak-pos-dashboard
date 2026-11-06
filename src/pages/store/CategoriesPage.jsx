import { useNavigate } from "react-router-dom"
import { useMemo, useState } from "react"
import { Eye, MapPin, Pencil, Plus, Trash2 } from "lucide-react"
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
import { CategoryLocationsModal } from "../../features/catalog/CategoryLocationsModal.jsx"
import { LocationScopePills } from "../../features/scope/LocationScopeField.jsx"
import { Button } from "../../ui/Button.jsx"
import { DataTable } from "../../ui/DataTable.jsx"
import { PageHeader, StatCards } from "../../ui/PageHeader.jsx"
import { useToast } from "../../ui/Toast.jsx"
import { Pill } from "../../ui/Pill.jsx"
import { SelectionBar } from "../../ui/SelectionBar.jsx"

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
  const listError = categoriesQuery.error?.message || ""

  const openCreate = () => setEditing({ category: null })
  const openEdit = (row) => setEditing({ category: row })

  // Store admin: tick categories, then Update Locations sets where all of them are sold at once.
  const [selectedIds, setSelectedIds] = useState([])
  const [locationsOpen, setLocationsOpen] = useState(false)
  // The table drops a deleted / filtered-out category from the selection.
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.id)), [rows, selectedIds])
  const clearSelection = () => setSelectedIds([])

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

  // Store admin: the switch on every category. Manager: the switch on his location's own
  // categories; a store-wide one (every location, set by the store admin) only shows "Active".
  const canToggle = (row) =>
    isAdmin ||
    (row.location_scope === "selected" && (row.location_ids || []).every((id) => id === user?.location_id))

  const columns = [
    { key: "category_number", header: "Category #", sortValue: (row) => Number(row.category_number), render: (row) => <span className="font-semibold text-slate-900">#{row.category_number}</span> },
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="flex min-w-40 items-center gap-3">
          {row.image_url ? (
            <img src={row.image_url} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] text-slate-400">No img</div>
          )}
          <p className="truncate font-semibold text-slate-900">{row.name}</p>
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
      render: (row) =>
        canToggle(row) ? (
          <div onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={row.is_active !== false}
              disabled={Boolean(toggling[row.id])}
              label={row.is_active !== false ? `Switch off ${row.name}` : `Switch on ${row.name}`}
              onChange={(next) => setActive(row, next)}
            />
          </div>
        ) : (
          <Pill tone={row.is_active !== false ? "emerald" : "rose"}>{row.is_active !== false ? "Active" : "Off"}</Pill>
        ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="icon" aria-label="View category" title="View" onClick={() => navigate(`/categories/${row.category_number}`)}><Eye className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label="Edit category" title="Edit" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="icon" aria-label="Delete category" title="Delete" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
        </div>
      ),
    },
  ]

  return (
    <section className={`space-y-6 ${isAdmin && selectedRows.length ? "pb-24" : ""}`}>
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
        title="Categories"
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
        selection={isAdmin ? { selected: selectedIds, onChange: setSelectedIds } : null}
      />

      <CategoryFormModal open={Boolean(editing)} category={editing?.category || null} categories={rows} onClose={() => setEditing(null)} />

      <SelectionBar count={isAdmin ? selectedRows.length : 0} noun={["category", "categories"]} onClear={clearSelection}>
        <Button onClick={() => setLocationsOpen(true)}>
          <MapPin className="h-4 w-4" /> Update Locations
        </Button>
      </SelectionBar>

      <CategoryLocationsModal
        open={locationsOpen}
        categories={selectedRows}
        onClose={() => setLocationsOpen(false)}
        onSaved={clearSelection}
      />
    </section>
  )
}

