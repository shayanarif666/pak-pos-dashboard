import { useQuery } from "@tanstack/react-query"
import {
  getCurrentLicense,
  listStoreBillings,
  listStoreLicenses,
} from "../../api/storeBilling.js"
import { unwrap } from "../../lib/query.js"
import { useAuth } from "../../auth/AuthContext.jsx"

export const storeBillingKeys = {
  all: ["store-billing"],
  billings: () => ["store-billing", "billings"],
  licenseMe: () => ["store-billing", "license-me"],
  licenses: () => ["store-billing", "licenses"],
}

export function useStoreBillingsQuery() {
  return useQuery({
    queryKey: storeBillingKeys.billings(),
    queryFn: async () => unwrap(await listStoreBillings()) || [],
  })
}

export function useCurrentLicenseQuery() {
  return useQuery({
    queryKey: storeBillingKeys.licenseMe(),
    queryFn: async () => unwrap(await getCurrentLicense()),
  })
}

export function useStoreLicensesQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: storeBillingKeys.licenses(),
    queryFn: async () => unwrap(await listStoreLicenses()) || [],
    enabled: user?.role === "store_admin",
  })
}
