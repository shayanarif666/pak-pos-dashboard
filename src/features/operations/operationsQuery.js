import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createStaff,
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

export function useStaffQuery() {
  return useQuery({
    queryKey: operationsKeys.staff,
    queryFn: async () => unwrap(await listStaff()) || [],
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

