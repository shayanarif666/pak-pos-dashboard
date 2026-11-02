import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createTax, deleteTax, listTaxes, updateTax } from "../../api/taxes.js"
import { unwrap } from "../../lib/query.js"

const keys = { all: ["store-taxes"] }

/** Every store tax (Taxes page), by number. */
export function useStoreTaxesQuery() {
  return useQuery({ queryKey: keys.all, queryFn: async () => unwrap(await listTaxes()) || [] })
}

/** Saving a tax also changes which taxes the products show, so the catalog reloads too. */
function useTaxMutation(request) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args) => unwrap(await request(args)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all })
      queryClient.invalidateQueries({ queryKey: ["catalog"] })
    },
  })
}

export const useSaveStoreTax = () => useTaxMutation(({ id, body }) => (id ? updateTax(id, body) : createTax(body)))
export const useDeleteStoreTax = () => useTaxMutation((id) => deleteTax(id))
