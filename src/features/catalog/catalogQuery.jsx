import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getCategory,
  getProduct,
  deleteVariant,
  removeVariantImage,
  uploadVariantImage,
  listBulkTiers,
  listCategories,
  listExpiryProducts,
  listLocations,
  listProducts,
  listWeightProducts,
  patchProductWeight,
  removeProductImage,
  uploadProductImage,
  putProductStock,
  updateCategory,
  updateCategoryLocations,
  updateProduct,
  bulkUpdateProductStatus,
} from "../../api/catalog.js"
import { unwrap } from "../../lib/query.js"

export const catalogKeys = {
  all: ["catalog"],
  categories: ["catalog", "categories"],
  category: (id, locationId) => ["catalog", "category", id, locationId || null],
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

/** Category detail: the category, its products (with stock) and totals — all from the API. */
export function useCategoryQuery(id, { locationId } = {}) {
  return useQuery({
    queryKey: catalogKeys.category(id, locationId),
    queryFn: async () => unwrap(await getCategory(id, locationId ? { location_id: locationId } : {})),
    enabled: Boolean(id),
  })
}

export function useLocationsQuery(options = {}) {
  return useQuery({
    queryKey: catalogKeys.locations,
    queryFn: async () => unwrap(await listLocations()) || [],
    enabled: options.enabled !== false,
  })
}

/**
 * The list shows a product with variants once, its variants inside it. sellableProducts() turns
 * each variant into a row of its own (e.g. "Pepsi - 1L") for pages that work with what is sold.
 */
export function sellableProducts(products) {
  return (products || []).flatMap((product) =>
    product.has_variants
      ? (product.variants || []).map((variant) => ({
          ...variant,
          title: variant.title || `${product.title} - ${variant.name}`,
          parent_product_id: product.id,
          variant_name: variant.name,
          category_id: product.category_id,
          category: product.category,
          unit: product.unit,
          image_url: product.image_url,
          featured_image: product.featured_image,
          low_stock_threshold: product.low_stock_threshold,
          is_weight_based: variant.is_weight_based ?? product.is_weight_based,
          location_scope: product.location_scope,
          location_ids: product.location_ids,
        }))
      : [product]
  )
}

export function useProductsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: catalogKeys.products(filters),
    queryFn: async () => unwrap(await listProducts(filters)) || [],
    enabled: options.enabled !== false,
    // sellable: every variant as a row of its own.
    ...(options.sellable ? { select: sellableProducts } : {}),
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

/** Update Locations on several categories at once (body: category_ids + location scope). */
export function useUpdateCategoryLocations() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: (body) => updateCategoryLocations(body),
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

/** Update Status from the products table: items[] = [{ id (product number), is_active }]. */
export function useBulkProductStatus() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: (items) => bulkUpdateProductStatus(items),
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

/**
 * Saves a product as JSON, then its one image through the image API (imageFile = new image,
 * removeImage = drop the current one), then the stock rows.
 */
export function useSaveProduct() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: async ({ id, body, imageFile, removeImage, variantImages = [], stockPayloads = [] }) => {
      const json = id ? await updateProduct(id, body) : await createProduct(body)
      const productId = json.data?.id || id
      if (imageFile) await uploadProductImage(productId, imageFile)
      else if (removeImage) await removeProductImage(productId)
      // Variant images: each variant is a product of its own, so its image goes to its own id.
      // A new variant's id is known only after the save: found by its name.
      const pending = variantImages.filter((row) => row.file || row.remove)
      if (pending.length) {
        const saved = pending.some((row) => !row.id) ? unwrap(await getProduct(productId))?.variants || [] : []
        for (const row of pending) {
          const variantId = row.id || saved.find((variant) => variant.name === row.name)?.id
          if (!variantId) continue
          if (row.file) await uploadVariantImage(productId, variantId, row.file)
          else await removeVariantImage(productId, variantId)
        }
      }
      for (const payload of stockPayloads) await putProductStock(productId, payload)
      return { ...json, productId }
    },
    onSuccess: invalidateCatalog,
  })
}

/** Soft delete of one variant (productId + variantId: UUIDs or numbers). */
export function useDeleteVariant() {
  const invalidateCatalog = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ productId, variantId }) => deleteVariant(productId, variantId),
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
