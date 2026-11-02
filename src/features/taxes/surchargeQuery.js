import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createSurcharge, deleteSurcharge, listSurcharges, updateSurcharge } from "../../api/surcharges.js"
import { unwrap } from "../../lib/query.js"

const keys = { all: ["payment-surcharges"] }

export function useSurchargesQuery() {
  return useQuery({ queryKey: keys.all, queryFn: async () => unwrap(await listSurcharges()) || [] })
}

function useSurchargeMutation(request) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args) => unwrap(await request(args)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}

export const useSaveSurcharge = () => useSurchargeMutation(({ id, body }) => (id ? updateSurcharge(id, body) : createSurcharge(body)))
export const useDeleteSurcharge = () => useSurchargeMutation((id) => deleteSurcharge(id))
