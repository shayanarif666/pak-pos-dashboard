import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addOrderPayment,
  cancelOrder,
  confirmPayment,
  getOrder,
  getOrderPayments,
  getOrderReceipt,
  getRefundReceipt,
  listCancelledOrders,
  listCustomOrders,
  listOrders,
  listRefunds,
  salesByLocation,
  refundEntireOrder,
  refundOrderItem,
  voidOrder,
} from "../../api/orders.js"
import { unwrap } from "../../lib/query.js"

export const orderKeys = {
  all: ["orders"],
  lists: () => ["orders", "list"],
  list: (filters = {}) => ["orders", "list", filters],
  custom: (filters = {}) => ["orders", "custom", filters],
  cancelled: (filters = {}) => ["orders", "cancelled", filters],
  refunds: (filters = {}) => ["orders", "refunds", filters],
  byLocation: (filters = {}) => ["orders", "byLocation", filters],
  detail: (id) => ["orders", "detail", id],
  payments: (id) => ["orders", "payments", id],
  receipt: (id) => ["orders", "receipt", id],
  refundReceipt: (orderId, refundId) => ["orders", "refundReceipt", orderId, refundId],
}

export function useInvalidateOrders() {
  const queryClient = useQueryClient()
  return function invalidateOrders() {
    return queryClient.invalidateQueries({ queryKey: orderKeys.all })
  }
}

export function useOrdersQuery(filters = {}) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: async () => unwrap(await listOrders(filters)) || [],
  })
}

export function useCustomOrdersQuery(filters = {}) {
  return useQuery({
    queryKey: orderKeys.custom(filters),
    queryFn: async () => unwrap(await listCustomOrders(filters)) || [],
  })
}

export function useCancelledOrdersQuery(filters = {}) {
  return useQuery({
    queryKey: orderKeys.cancelled(filters),
    queryFn: async () => unwrap(await listCancelledOrders(filters)) || { orders: [], count: 0, lost_sales: 0 },
  })
}

export function useSalesByLocationQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: orderKeys.byLocation(filters),
    queryFn: async () => unwrap(await salesByLocation(filters)) || { locations: [], totals: {} },
    enabled: options.enabled !== false,
  })
}

export function useRefundsQuery(filters = {}) {
  return useQuery({
    queryKey: orderKeys.refunds(filters),
    queryFn: async () => unwrap(await listRefunds(filters)) || [],
  })
}

export function useOrderQuery(id, options = {}) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => unwrap(await getOrder(id)),
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useOrderPaymentsQuery(id, options = {}) {
  return useQuery({
    queryKey: orderKeys.payments(id),
    queryFn: async () => unwrap(await getOrderPayments(id)) || [],
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useOrderReceiptQuery(id, options = {}) {
  return useQuery({
    queryKey: orderKeys.receipt(id),
    queryFn: async () => unwrap(await getOrderReceipt(id)),
    enabled: Boolean(id) && options.enabled !== false,
    retry: false,
  })
}

export function useRefundReceiptQuery(orderId, refundId, options = {}) {
  return useQuery({
    queryKey: orderKeys.refundReceipt(orderId, refundId),
    queryFn: async () => unwrap(await getRefundReceipt(orderId, refundId)),
    enabled: Boolean(orderId && refundId) && options.enabled === true,
    retry: false,
  })
}

export function useVoidOrder() {
  const invalidateOrders = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, body }) => voidOrder(id, body),
    onSuccess: invalidateOrders,
  })
}

export function useCancelOrder() {
  const invalidateOrders = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, body }) => cancelOrder(id, body),
    onSuccess: invalidateOrders,
  })
}

export function useRefundOrderItem() {
  const invalidateOrders = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, body }) => refundOrderItem(id, body),
    onSuccess: invalidateOrders,
  })
}

export function useRefundEntireOrder() {
  const invalidateOrders = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, body }) => refundEntireOrder(id, body),
    onSuccess: invalidateOrders,
  })
}

export function useAddOrderPayment() {
  const invalidateOrders = useInvalidateOrders()
  return useMutation({
    mutationFn: ({ id, body }) => addOrderPayment(id, body),
    onSuccess: invalidateOrders,
  })
}

export function useConfirmPayment() {
  const invalidateOrders = useInvalidateOrders()
  return useMutation({
    mutationFn: (id) => confirmPayment(id),
    onSuccess: invalidateOrders,
  })
}
