import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  clockIn,
  clockOut,
  closeBatch,
  deleteBatch,
  deleteStaffSession,
  listBatches,
  listStaffSessions,
  openBatch,
  updateBatch,
  updateStaffSession,
} from "../../api/operations.js"
import { listTransactions } from "../../api/orders.js"
import { getCurrency, putCurrency } from "../../api/settings.js"
import { unwrap } from "../../lib/query.js"

const live = { staleTime: 0 }

/** A paged list: { rows, pagination } — the API returns data + pagination side by side. */
async function paged(request) {
  const json = await request
  return { rows: json?.data || [], pagination: json?.pagination || { page: 1, limit: 20, total: 0, total_pages: 1 } }
}

export function useStaffSessionsQuery(params = {}) {
  return useQuery({
    queryKey: ["lists", "staff-sessions", params],
    queryFn: () => paged(listStaffSessions(params)),
    placeholderData: keepPreviousData,
    ...live,
  })
}

export function useTransactionsQuery(params = {}) {
  return useQuery({
    queryKey: ["lists", "transactions", params],
    queryFn: () => paged(listTransactions(params)),
    placeholderData: keepPreviousData,
    ...live,
  })
}

export function useBatchesQuery(params = {}) {
  return useQuery({
    queryKey: ["lists", "batches", params],
    queryFn: async () => unwrap(await listBatches(params)) || [],
    ...live,
  })
}

/** A dashboard action on batches / attendance; every list reloads after it. */
function useListAction(request) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body) => unwrap(await request(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lists"] }),
  })
}

export const useOpenBatch = () => useListAction(openBatch)
export const useCloseBatch = () => useListAction(closeBatch)
export const useClockIn = () => useListAction(clockIn)
export const useClockOut = () => useListAction(clockOut)
export const useUpdateStaffSession = () => useListAction(({ id, body }) => updateStaffSession(id, body))
export const useDeleteStaffSession = () => useListAction(deleteStaffSession)
export const useUpdateBatch = () => useListAction(({ id, body }) => updateBatch(id, body))
export const useDeleteBatch = () => useListAction(deleteBatch)

export function useCurrencyQuery() {
  return useQuery({ queryKey: ["settings", "currency"], queryFn: async () => unwrap(await getCurrency()) })
}

export function useSaveCurrency() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body) => unwrap(await putCurrency(body)),
    onSuccess: () => client.invalidateQueries({ queryKey: ["settings", "currency"] }),
  })
}
