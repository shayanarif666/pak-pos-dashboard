import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  downloadReportExport,
  getBreakdownReport,
  getDashboardReport,
  getPaymentsReport,
  getProfitReport,
  getSalesReport,
} from "../../api/reports.js"
import { unwrap } from "../../lib/query.js"

export const reportKeys = {
  all: ["reports"],
  dashboard: (filters = {}) => ["reports", "dashboard", filters],
  sales: (filters = {}) => ["reports", "sales", filters],
  payments: (filters = {}) => ["reports", "payments", filters],
  breakdown: (filters = {}) => ["reports", "breakdown", filters],
  profit: (filters = {}) => ["reports", "profit", filters],
}

export function useDashboardReportQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: reportKeys.dashboard(filters),
    queryFn: async () => unwrap(await getDashboardReport(filters)),
    enabled: options.enabled !== false,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useSalesReportQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: reportKeys.sales(filters),
    queryFn: async () => unwrap(await getSalesReport(filters)),
    enabled: options.enabled !== false,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function usePaymentsReportQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: reportKeys.payments(filters),
    queryFn: async () => unwrap(await getPaymentsReport(filters)),
    enabled: options.enabled !== false,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useBreakdownReportQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: reportKeys.breakdown(filters),
    queryFn: async () => unwrap(await getBreakdownReport(filters)),
    enabled: options.enabled !== false,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useProfitReportQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: reportKeys.profit(filters),
    queryFn: async () => unwrap(await getProfitReport(filters)),
    enabled: options.enabled !== false,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useExportReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params) => {
      const file = await downloadReportExport(params)
      const url = URL.createObjectURL(file.blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = file.filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      return file
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
    },
  })
}
