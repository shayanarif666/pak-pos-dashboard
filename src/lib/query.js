import { QueryClient } from "@tanstack/react-query"

export const QUERY_STALE_TIME = 15 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_STALE_TIME * 2,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function unwrap(json) {
  return json?.data ?? null
}
