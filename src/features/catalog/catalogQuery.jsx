import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getProduct,
  listBulkTiers,
  listCategories,
  listExpiryProducts,
  listLocations,
  listProducts,
  listWeightProducts,
  patchProductWeight,
  putBulkTiers,
  putProductStock,
  updateCategory,
  updateProduct,
} from "../../api/catalog.js"
import { unwrap } from "../../lib/query.js"

export const catalogKeys = {
  all: ["catalog"],
  categories: ["catalog", "categories"],
  locations: ["catalog", "locations"],
  products: (filters = {}) => ["catalog", "products", filters],
  product: (id, locationId) => ["catalog", "product", id, locationId || null],
  tiers: (id) => ["catalog", "tiers", id],
  expiry: ["catalog", "expiry"],
  weight: ["catalog", "weight"],
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: async () => unwrap(await listCategories()) || [],
  })
}

export function useLocationsQuery(options = {}) {
  return useQuery({
    queryKey: catalogKeys.locations,
    queryFn: async () => unwrap(await listLocations()) || [],
    enabled: options.enabled !== false,
  })
}

export function useProductsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: catalogKeys.products(filters),
    queryFn: async () => unwrap(await listProducts(filters)) || [],
    enabled: options.enabled !== false,
  })
}

export function useProductQuery(id, { locationId } = {}, options = {}) {
  return useQuery({
    queryKey: catalogKeys.product(id, locationId),
    queryFn: async () => unwrap(await getProduct(id, { locationId })),
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useBulkTiersQuery(id, options = {}) {
  return useQuery({
    queryKey: catalogKeys.tiers(id),
    queryFn: async () => unwrap(await listBulkTiers(id)) || [],
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useInvalidateCatalog() {
  const queryClient = useQueryClient()
  return function invalidateCatalog() {
    return queryClient.invalidateQueries({ queryKey: catalogKeys.all })
  }
}

export function useSaveCategory() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: async ({ id, body, imageFile }) => {
      if (id) return updateCategory(id, body, imageFile)
      return createCategory(body, imageFile)
    },
    onSuccess: invalidateCatalog,
  })
}

export function useDeleteCategory() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: invalidateCatalog,
  })
}

export function useDisableProduct() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: invalidateCatalog,
  })
}

export function useSaveProduct() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: async ({
      id,
      body,
      featuredFile,
      imageFiles,
      existingImages,
      tiers,
      stockPayload,
      stockPayloads,
    }) => {
      const media = { featuredFile, imageFiles, existingImages }
      const json = id
        ? await updateProduct(id, body, media)
        : await createProduct(body, media)
      const productId = json.data?.id || id
      await putBulkTiers(productId, tiers)
      const rows = stockPayloads?.length
        ? stockPayloads
        : stockPayload
          ? [stockPayload]
          : []
      for (const payload of rows) {
        await putProductStock(productId, payload)
      }
      return { ...json, productId }
    },
    onSuccess: invalidateCatalog,
  })
}

export function useSaveStock() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ productId, body }) => putProductStock(productId, body),
    onSuccess: invalidateCatalog,
  })
}

export function useExpiryQuery() {
  return useQuery({
    queryKey: catalogKeys.expiry,
    queryFn: async () => unwrap(await listExpiryProducts()) || [],
  })
}

export function useWeightQuery() {
  return useQuery({
    queryKey: catalogKeys.weight,
    queryFn: async () => unwrap(await listWeightProducts()) || [],
  })
}

export function usePatchWeight() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, is_weight_based }) => patchProductWeight(id, is_weight_based),
    onSuccess: invalidateCatalog,
  })
}
