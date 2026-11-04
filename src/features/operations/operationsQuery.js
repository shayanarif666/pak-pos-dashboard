import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createStaff,
  deleteStaff,
  getStaffSales,
  listRegisterSessions,
  listStaff,
  updateStaff,
} from "../../api/operations.js"
import { unwrap } from "../../lib/query.js"

export const operationsKeys = {
  all: ["operations"],
  sessions: (filters = {}) => ["operations", "sessions", filters],
  staff: ["operations", "staff"],
  staffSales: (id, filters = {}) => ["operations", "staff-sales", id, filters],
}

// Shifts are live data: always refetch instead of using the long default stale time.
const live = { staleTime: 0 }

export function useRegisterSessionsQuery(filters = {}) {
  return useQuery({
    queryKey: operationsKeys.sessions(filters),
    queryFn: async () => unwrap(await listRegisterSessions(filters)) || [],
    ...live,
  })
}

/**
 * The store's staff. Deleted staff (soft deleted) are fetched too, so history still shows their
 * names (withDeleted), but are left out of the list everywhere else.
 */
export function useStaffQuery({ withDeleted = false } = {}) {
  return useQuery({
    queryKey: operationsKeys.staff,
    queryFn: async () => unwrap(await listStaff({ include_deleted: 1 })) || [],
    select: withDeleted ? undefined : (rows) => rows.filter((row) => !row.deleted),
  })
}

export function useDeleteStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => unwrap(await deleteStaff(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: operationsKeys.staff }),
  })
}

export function useSaveStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }) =>
      unwrap(id ? await updateStaff(id, body) : await createStaff(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: operationsKeys.staff }),
  })
}

export function useStaffSalesQuery(id, filters = {}, options = {}) {
  return useQuery({
    queryKey: operationsKeys.staffSales(id, filters),
    queryFn: async () => unwrap(await getStaffSales(id, filters)),
    enabled: Boolean(id) && options.enabled !== false,
  })
}

