import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "../../api/customers.js"
import {
  addCustomerCredit,
  listCustomerCredit,
} from "../../api/promotions.js"
import { unwrap } from "../../lib/query.js"

export const customerKeys = {
  all: ["customers"],
  lists: () => ["customers", "list"],
  list: (filters = {}) => ["customers", "list", filters],
  detail: (id) => ["customers", "detail", id],
  credit: (id) => ["customers", "credit", id],
}

export function useInvalidateCustomers() {
  const queryClient = useQueryClient()
  return function invalidateCustomers() {
    return queryClient.invalidateQueries({ queryKey: customerKeys.all })
  }
}

export function useCustomersQuery(filters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => unwrap(await listCustomers(filters)) || [],
  })
}

export function useCustomerQuery(id, options = {}) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => unwrap(await getCustomer(id)),
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useCustomerCreditQuery(id, options = {}) {
  return useQuery({
    queryKey: customerKeys.credit(id),
    queryFn: async () => unwrap(await listCustomerCredit(id)) || [],
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useSaveCustomer() {
  const invalidateCustomers = useInvalidateCustomers()
  return useMutation({
    mutationFn: ({ id, body }) => (id ? updateCustomer(id, body) : createCustomer(body)),
    onSuccess: invalidateCustomers,
  })
}

export function useAddCustomerCredit() {
  const invalidateCustomers = useInvalidateCustomers()
  return useMutation({
    mutationFn: ({ id, body }) => addCustomerCredit(id, body),
    onSuccess: invalidateCustomers,
  })
}
