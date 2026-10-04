import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createLocation,
  listApprovalRequests,
  listAuditLogs,
  listLocations,
  listPosDevices,
  pinOverride,
  registerPosDevice,
  reviewApprovalRequest,
  updateLocation,
  updatePosDevice,
} from "../../api/people.js"
import { catalogKeys } from "../catalog/catalogQuery.jsx"
import { unwrap } from "../../lib/query.js"

export const peopleKeys = {
  all: ["people"],
  locations: ["people", "locations"],
  devices: (filters = {}) => ["people", "devices", filters],
  approvals: (filters = {}) => ["people", "approvals", filters],
  audit: (filters = {}) => ["people", "audit", filters],
}

export function useStoreLocationsQuery(options = {}) {
  return useQuery({
    queryKey: peopleKeys.locations,
    queryFn: async () => unwrap(await listLocations()) || [],
    enabled: options.enabled !== false,
  })
}

export function useSaveLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }) =>
      unwrap(id ? await updateLocation(id, body) : await createLocation(body)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: peopleKeys.locations }),
        queryClient.invalidateQueries({ queryKey: catalogKeys.locations }),
      ])
    },
  })
}

export function usePosDevicesQuery(filters = {}) {
  return useQuery({
    queryKey: peopleKeys.devices(filters),
    queryFn: async () => unwrap(await listPosDevices(filters)) || [],
  })
}

export function useRegisterPosDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body) => unwrap(await registerPosDevice(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
  })
}

export function useUpdatePosDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }) => unwrap(await updatePosDevice(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
  })
}

export function useApprovalRequestsQuery(filters = {}) {
  return useQuery({
    queryKey: peopleKeys.approvals(filters),
    queryFn: async () => unwrap(await listApprovalRequests(filters)) || [],
  })
}

export function useReviewApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }) => unwrap(await reviewApprovalRequest(id, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
  })
}

export function usePinOverride() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body) => unwrap(await pinOverride(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
  })
}

export function useAuditLogsQuery(filters = {}) {
  return useQuery({
    queryKey: peopleKeys.audit(filters),
    queryFn: async () => unwrap(await listAuditLogs(filters)) || [],
  })
}
