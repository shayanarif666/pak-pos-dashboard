import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAdminPosDevice,
  createBilling,
  createLicense,
  createPlan,
  createStore,
  deletePlan,
  getStore,
  listAdminAuditLogs,
  listAdminPosDevices,
  listBillings,
  listLicenses,
  listPlans,
  listStores,
  renewLicense,
  extendLicense,
  suspendLicense,
  activateLicense,
  revokeLicense,
  updateBilling,
  updateLicense,
  updatePlan,
  updateStore,
} from "../../api/admin.js"
import { unwrap } from "../../lib/query.js"

export const adminKeys = {
  all: ["admin"],
  stores: ["admin", "stores"],
  store: (id) => ["admin", "store", id],
  plans: ["admin", "plans"],
  licenses: ["admin", "licenses"],
  billings: ["admin", "billings"],
  audit: (filters = {}) => ["admin", "audit", filters],
  devices: (filters = {}) => ["admin", "devices", filters],
}

export function useStoresQuery() {
  return useQuery({
    queryKey: adminKeys.stores,
    queryFn: async () => unwrap(await listStores()) || [],
  })
}

export function useStoreQuery(id, options = {}) {
  return useQuery({
    queryKey: adminKeys.store(id),
    queryFn: async () => unwrap(await getStore(id)),
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function usePlansQuery() {
  return useQuery({
    queryKey: adminKeys.plans,
    queryFn: async () => unwrap(await listPlans()) || [],
  })
}

export function useLicensesQuery() {
  return useQuery({
    queryKey: adminKeys.licenses,
    queryFn: async () => unwrap(await listLicenses()) || [],
  })
}

export function useBillingsQuery() {
  return useQuery({
    queryKey: adminKeys.billings,
    queryFn: async () => unwrap(await listBillings()) || [],
  })
}

export function useAdminAuditLogsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: adminKeys.audit(filters),
    queryFn: async () => unwrap(await listAdminAuditLogs(filters)) || [],
    enabled: options.enabled !== false,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useAdminPosDevicesQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: adminKeys.devices(filters),
    queryFn: async () => unwrap(await listAdminPosDevices(filters)) || [],
    enabled: options.enabled !== false,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useInvalidateAdmin() {
  const queryClient = useQueryClient()
  return function invalidateAdmin() {
    return queryClient.invalidateQueries({ queryKey: adminKeys.all })
  }
}

export function useCreateAdminPosDevice() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: async (body) => unwrap(await createAdminPosDevice(body)),
    onSuccess: invalidateAdmin,
  })
}

export function useSaveStore() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: async ({ id, body }) => {
      if (id) return updateStore(id, body)
      return createStore(body)
    },
    onSuccess: invalidateAdmin,
  })
}

export function useSavePlan() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: async ({ id, body }) => {
      if (id) return updatePlan(id, body)
      return createPlan(body)
    },
    onSuccess: invalidateAdmin,
  })
}

export function useDeletePlan() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: (id) => deletePlan(id),
    onSuccess: invalidateAdmin,
  })
}

export function useCreateLicense() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: (body) => createLicense(body),
    onSuccess: invalidateAdmin,
  })
}

export function useRevokeLicense() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, body }) => revokeLicense(id, body),
    onSuccess: invalidateAdmin,
  })
}

export function useRenewLicense() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, body }) => renewLicense(id, body),
    onSuccess: invalidateAdmin,
  })
}

export function useExtendLicense() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: (id) => extendLicense(id),
    onSuccess: invalidateAdmin,
  })
}

export function useSuspendLicense() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, body }) => suspendLicense(id, body),
    onSuccess: invalidateAdmin,
  })
}

export function useActivateLicense() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: (id) => activateLicense(id),
    onSuccess: invalidateAdmin,
  })
}

export function useUpdateLicense() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, body }) => updateLicense(id, body),
    onSuccess: invalidateAdmin,
  })
}

export function useCreateBilling() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: (body) => createBilling(body),
    onSuccess: invalidateAdmin,
  })
}

export function useUpdateBilling() {
  const invalidateAdmin = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, body }) => updateBilling(id, body),
    onSuccess: invalidateAdmin,
  })
}
