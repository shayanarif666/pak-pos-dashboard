import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addSupplierLedger,
  cancelStockTransfer,
  completeStockTransfer,
  createStockMovement,
  createStockMovementsBulk,
  createStockTransfer,
  createSupplier,
  deleteStockEntry,
  deleteStockTransfer,
  updateStockTransfers,
  deleteStockMovement,
  deleteSupplier,
  updateStockMovements,
  updateStocks,
  getSupplier,
  listStockMovements,
  listStockTransfers,
  listSupplierLedger,
  listSuppliers,
  updateSupplier,
} from "../../api/inventory.js"
import { catalogKeys } from "../catalog/catalogQuery.jsx"
import { unwrap } from "../../lib/query.js"

export const inventoryKeys = {
  all: ["inventory"],
  movements: (filters = {}) => ["inventory", "movements", filters],
  transfers: ["inventory", "transfers"],
  suppliers: ["inventory", "suppliers"],
  supplier: (id) => ["inventory", "supplier", id],
  ledger: (id) => ["inventory", "ledger", id],
}

function useInvalidateInventory() {
  const queryClient = useQueryClient()
  return function invalidateInventory({ catalog = false } = {}) {
    const jobs = [queryClient.invalidateQueries({ queryKey: inventoryKeys.all })]
    if (catalog) jobs.push(queryClient.invalidateQueries({ queryKey: catalogKeys.all }))
    return Promise.all(jobs)
  }
}

export function useStockMovementsQuery(filters = {}) {
  return useQuery({
    queryKey: inventoryKeys.movements(filters),
    queryFn: async () => unwrap(await listStockMovements(filters)) || [],
  })
}

export function useCreateStockMovement() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: (body) => createStockMovement(body),
    onSuccess: () => invalidateInventory({ catalog: true }),
  })
}

/** Edit / soft delete a movement or a stock entry; stock, movements and expiry all refresh. */
export function useStockEdit() {
  const invalidateInventory = useInvalidateInventory()
  const onSuccess = () => invalidateInventory({ catalog: true })
  return {
    // One row each from the dashboard, through the bulk APIs ({ items: [...] }).
    updateMovement: useMutation({ mutationFn: ({ id, body }) => updateStockMovements([{ id, ...body }]), onSuccess }),
    deleteMovement: useMutation({ mutationFn: (id) => deleteStockMovement(id), onSuccess }),
    updateEntry: useMutation({ mutationFn: (item) => updateStocks([item]), onSuccess }),
    // A lot: { id (lot number), product_id, location_id } (lot numbers are per product).
    deleteEntry: useMutation({ mutationFn: (ref) => (typeof ref === "object" ? deleteStockEntry(ref.id, ref) : deleteStockEntry(ref)), onSuccess }),
  }
}

export function useStockTransfersQuery() {
  return useQuery({
    queryKey: inventoryKeys.transfers,
    queryFn: async () => unwrap(await listStockTransfers()) || [],
  })
}

export function useCreateStockTransfer() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: (body) => createStockTransfer(body),
    onSuccess: () => invalidateInventory(),
  })
}

export function useCompleteStockTransfer() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: (id) => completeStockTransfer(id),
    onSuccess: () => invalidateInventory({ catalog: true }),
  })
}

export function useCancelStockTransfer() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: (id) => cancelStockTransfer(id),
    onSuccess: () => invalidateInventory(),
  })
}

/** Edit one transfer (sent as items[] to PATCH /stock-transfers/bulk). */
export function useUpdateStockTransfer() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: (item) => updateStockTransfers([item]),
    onSuccess: () => invalidateInventory(),
  })
}

/** Soft delete a transfer (id = transfer number). */
export function useDeleteStockTransfer() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: (transferNumber) => deleteStockTransfer(transferNumber),
    onSuccess: () => invalidateInventory(),
  })
}

export function useSuppliersQuery(params = {}) {
  return useQuery({
    queryKey: [...inventoryKeys.suppliers, params],
    queryFn: async () => unwrap(await listSuppliers(params)) || [],
  })
}

export function useSupplierQuery(id) {
  return useQuery({
    queryKey: inventoryKeys.supplier(id),
    queryFn: async () => unwrap(await getSupplier(id)),
    enabled: Boolean(id),
  })
}

export function useSupplierLedgerQuery(id) {
  return useQuery({
    queryKey: inventoryKeys.ledger(id),
    queryFn: async () => unwrap(await listSupplierLedger(id)) || [],
    enabled: Boolean(id),
  })
}

export function useSaveSupplier() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: async ({ id, body }) => {
      if (id) return updateSupplier(id, body)
      return createSupplier(body)
    },
    onSuccess: () => invalidateInventory(),
  })
}

export function useDeleteSupplier() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: (id) => deleteSupplier(id),
    onSuccess: () => invalidateInventory(),
  })
}

export function useAddSupplierLedger() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: ({ id, body }) => addSupplierLedger(id, body),
    onSuccess: (_data, variables) =>
      invalidateInventory({ catalog: Boolean(variables.body?.product_id) }),
  })
}

export function useCreateStockMovementsBulk() {
  const invalidateInventory = useInvalidateInventory()
  return useMutation({
    mutationFn: (body) => createStockMovementsBulk(body),
    onSuccess: () => invalidateInventory({ catalog: true }),
  })
}
