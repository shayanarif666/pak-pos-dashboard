import { apiDelete, apiGet, apiPatch, apiPost, apiPut, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listCategories() {
  return apiGet("/api/v1/categories", auth)
}

export function getCategory(id) {
  return apiGet(`/api/v1/categories/${id}`, auth)
}

export function createCategory(body, imageFile) {
  if (imageFile) {
    const form = objectToForm(body)
    form.append("image", imageFile)
    return apiPost("/api/v1/categories", form, auth)
  }
  return apiPost("/api/v1/categories", body, auth)
}

export function updateCategory(id, body, imageFile) {
  if (imageFile) {
    const form = objectToForm(body)
    form.append("image", imageFile)
    return apiPatch(`/api/v1/categories/${id}`, form, auth)
  }
  return apiPatch(`/api/v1/categories/${id}`, body, auth)
}

export function deleteCategory(id) {
  return apiDelete(`/api/v1/categories/${id}`, auth)
}

export function listProducts(params = {}) {
  return apiGet(withQuery("/api/v1/products", params), auth)
}

export function getProduct(id, params = {}) {
  return apiGet(withQuery(`/api/v1/products/${id}`, params), auth)
}

export function createProduct(body, { featuredFile, imageFiles, existingImages } = {}) {
  const hasMedia =
    featuredFile ||
    (imageFiles && imageFiles.length) ||
    existingImages !== undefined
  if (hasMedia) {
    const form = objectToForm(body)
    if (existingImages !== undefined) {
      form.append("existing_images", JSON.stringify(existingImages))
    }
    if (featuredFile) form.append("featured", featuredFile)
    for (const file of imageFiles || []) form.append("images", file)
    return apiPost("/api/v1/products", form, auth)
  }
  return apiPost("/api/v1/products", body, auth)
}

export function updateProduct(id, body, { featuredFile, imageFiles, existingImages } = {}) {
  const hasMedia =
    featuredFile ||
    (imageFiles && imageFiles.length) ||
    existingImages !== undefined
  if (hasMedia) {
    const form = objectToForm(body)
    if (existingImages !== undefined) {
      form.append("existing_images", JSON.stringify(existingImages))
    }
    if (featuredFile) form.append("featured", featuredFile)
    for (const file of imageFiles || []) form.append("images", file)
    return apiPatch(`/api/v1/products/${id}`, form, auth)
  }
  return apiPatch(`/api/v1/products/${id}`, body, auth)
}

export function deleteProduct(id) {
  return apiDelete(`/api/v1/products/${id}`, auth)
}

export function listBulkTiers(productId) {
  return apiGet(`/api/v1/products/${productId}/bulk-tiers`, auth)
}

export function putBulkTiers(productId, tiers) {
  return apiPut(`/api/v1/products/${productId}/bulk-tiers`, { tiers }, auth)
}

export function listProductStocks(params = {}) {
  return apiGet(withQuery("/api/v1/product-stocks", params), auth)
}

export function listLowProductStocks(params = {}) {
  return apiGet(withQuery("/api/v1/product-stocks/low", params), auth)
}

export function putProductStock(productId, body) {
  return apiPut(`/api/v1/product-stocks/${productId}`, body, auth)
}

export function listLocations() {
  return apiGet("/api/v1/locations", auth)
}

export function listExpiryProducts() {
  return apiGet("/api/v1/products/expiry", auth)
}

export function listWeightProducts() {
  return apiGet("/api/v1/products/weight", auth)
}

export function patchProductWeight(id, is_weight_based) {
  return apiPatch(`/api/v1/products/${id}/weight`, { is_weight_based }, auth)
}

function objectToForm(body) {
  const form = new FormData()
  for (const [key, value] of Object.entries(body || {})) {
    if (value === undefined) continue
    if (key === "images" || key === "existing_images") continue
    if (value === null) form.append(key, "")
    else if (typeof value === "boolean") form.append(key, value ? "true" : "false")
    else if (typeof value === "object") form.append(key, JSON.stringify(value))
    else form.append(key, String(value))
  }
  return form
}
