import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createBackup,
  createBanner,
  deleteBanner,
  getContent,
  getMyStore,
  getShipping,
  getTheme,
  listBackups,
  listBanners,
  listDataModules,
  putContent,
  putShipping,
  putTheme,
  restoreBackup,
  updateBanner,
  updateMe,
  updateMyStore,
  wipeDataModule,
} from "../../api/settings.js"
import { unwrap } from "../../lib/query.js"

export const settingsKeys = {
  all: ["settings"],
  store: ["settings", "store"],
  theme: ["settings", "theme"],
  content: ["settings", "content"],
  shipping: ["settings", "shipping"],
  banners: ["settings", "banners"],
  backups: ["settings", "backups"],
  dataModules: ["settings", "data-modules"],
}

function useSettingsMutation(fn, keys) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars) => unwrap(await fn(vars)),
    onSuccess: () =>
      Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

export function useMyStoreQuery(options = {}) {
  return useQuery({
    queryKey: settingsKeys.store,
    queryFn: async () => unwrap(await getMyStore()),
    enabled: options.enabled !== false,
  })
}

export const useUpdateMyStore = () => useSettingsMutation(updateMyStore, [settingsKeys.store])
export const useUpdateMe = () => useSettingsMutation(updateMe, [])

export function useThemeQuery() {
  return useQuery({ queryKey: settingsKeys.theme, queryFn: async () => unwrap(await getTheme()) })
}
export const usePutTheme = () => useSettingsMutation(putTheme, [settingsKeys.theme])

export function useContentQuery() {
  return useQuery({ queryKey: settingsKeys.content, queryFn: async () => unwrap(await getContent()) })
}
export const usePutContent = () => useSettingsMutation(putContent, [settingsKeys.content])

export function useShippingQuery() {
  return useQuery({ queryKey: settingsKeys.shipping, queryFn: async () => unwrap(await getShipping()) })
}
export const usePutShipping = () => useSettingsMutation(putShipping, [settingsKeys.shipping])

export function useBannersQuery() {
  return useQuery({
    queryKey: settingsKeys.banners,
    queryFn: async () => unwrap(await listBanners()) || [],
  })
}
export const useCreateBanner = () => useSettingsMutation(createBanner, [settingsKeys.banners])
export const useUpdateBanner = () =>
  useSettingsMutation(({ id, body }) => updateBanner(id, body), [settingsKeys.banners])
export const useDeleteBanner = () => useSettingsMutation(deleteBanner, [settingsKeys.banners])

export function useBackupsQuery() {
  return useQuery({
    queryKey: settingsKeys.backups,
    queryFn: async () => unwrap(await listBackups()) || [],
  })
}
export const useCreateBackup = () => useSettingsMutation(createBackup, [settingsKeys.backups])
export const useRestoreBackup = () => useSettingsMutation(restoreBackup, [settingsKeys.backups])

export function useDataModulesQuery() {
  return useQuery({
    queryKey: settingsKeys.dataModules,
    queryFn: async () => unwrap(await listDataModules()) || [],
  })
}
export const useWipeDataModule = () => useSettingsMutation(wipeDataModule, [settingsKeys.dataModules])
