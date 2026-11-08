import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createBulkDiscount,
  createBundleDiscount,
  createOrderDiscount,
  deleteBulkDiscount,
  deleteBundleDiscount,
  deleteOrderDiscount,
  getBulkDiscount,
  listBulkDiscounts,
  listBundleDiscounts,
  listOrderDiscounts,
  replaceBulkDiscountTargets,
  updateBulkDiscount,
  updateBundleDiscount,
  updateOrderDiscount,
} from "../../api/discounts.js"
import { unwrap } from "../../lib/query.js"

export const discountKeys = {
  all: ["discounts"],
  order: ["discounts", "order"],
  bulk: ["discounts", "bulk"],
  bulkOne: (id) => ["discounts", "bulk", id],
  bundle: ["discounts", "bundle"],
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: discountKeys.all })
}

// ---- Order level
export function useOrderDiscountsQuery() {
  return useQuery({ queryKey: discountKeys.order, queryFn: async () => unwrap(await listOrderDiscounts()) || [] })
}

export function useSaveOrderDiscount() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }) => (id ? updateOrderDiscount(id, body) : createOrderDiscount(body)),
    onSuccess: invalidate,
  })
}

export function useDeleteOrderDiscount() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id) => deleteOrderDiscount(id), onSuccess: invalidate })
}

// ---- Bulk (buy X get Y)
export function useBulkDiscountsQuery() {
  return useQuery({ queryKey: discountKeys.bulk, queryFn: async () => unwrap(await listBulkDiscounts()) || [] })
}

export function useBulkDiscountQuery(id, options = {}) {
  return useQuery({
    queryKey: discountKeys.bulkOne(id),
    queryFn: async () => unwrap(await getBulkDiscount(id)),
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useSaveBulkDiscount() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, body, targets }) => {
      const json = id ? await updateBulkDiscount(id, body) : await createBulkDiscount(body)
      const savedId = json.data?.id || id
      if (savedId && targets) await replaceBulkDiscountTargets(savedId, targets)
      return json
    },
    onSuccess: invalidate,
  })
}

export function useDeleteBulkDiscount() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id) => deleteBulkDiscount(id), onSuccess: invalidate })
}

// ---- Bundle
export function useBundleDiscountsQuery() {
  return useQuery({ queryKey: discountKeys.bundle, queryFn: async () => unwrap(await listBundleDiscounts()) || [] })
}

export function useSaveBundleDiscount() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }) => (id ? updateBundleDiscount(id, body) : createBundleDiscount(body)),
    onSuccess: invalidate,
  })
}

export function useDeleteBundleDiscount() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id) => deleteBundleDiscount(id), onSuccess: invalidate })
}
