import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getTaxRates, putTaxRates } from "../../api/tax.js"
import { unwrap } from "../../lib/query.js"

export const taxKeys = {
  all: ["tax-rates"],
  detail: () => ["tax-rates", "detail"],
}

export function useTaxRatesQuery() {
  return useQuery({
    queryKey: taxKeys.detail(),
    queryFn: async () => unwrap(await getTaxRates()),
  })
}

export function useSaveTaxRates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body) => unwrap(await putTaxRates(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taxKeys.all }),
  })
}
