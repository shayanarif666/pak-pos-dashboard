import { apiDelete, apiGet, apiPatch, apiPost, apiPut, withQuery } from "../lib/http.js"

const auth = { auth: true }

// Order level discounts: name, type, amount, apply to all orders.
export const listOrderDiscounts = (params = {}) => apiGet(withQuery("/api/v1/discounts", params), auth)
export const createOrderDiscount = (body) => apiPost("/api/v1/discounts", body, auth)
export const updateOrderDiscount = (id, body) => apiPatch(`/api/v1/discounts/${id}`, body, auth)
export const deleteOrderDiscount = (id) => apiDelete(`/api/v1/discounts/${id}`, auth)

// Bulk discounts: buy X, get Y free.
export const listBulkDiscounts = (params = {}) => apiGet(withQuery("/api/v1/bulk-discounts", params), auth)
export const getBulkDiscount = (id) => apiGet(`/api/v1/bulk-discounts/${id}`, auth)
export const createBulkDiscount = (body) => apiPost("/api/v1/bulk-discounts", body, auth)
export const updateBulkDiscount = (id, body) => apiPatch(`/api/v1/bulk-discounts/${id}`, body, auth)
export const deleteBulkDiscount = (id) => apiDelete(`/api/v1/bulk-discounts/${id}`, auth)
export const replaceBulkDiscountTargets = (id, targets) => apiPut(`/api/v1/bulk-discounts/${id}/targets`, { targets }, auth)

// Bundle discounts: a discount on a whole pack / carton.
export const listBundleDiscounts = (params = {}) => apiGet(withQuery("/api/v1/bundle-discounts", params), auth)
export const createBundleDiscount = (body) => apiPost("/api/v1/bundle-discounts", body, auth)
export const updateBundleDiscount = (id, body) => apiPatch(`/api/v1/bundle-discounts/${id}`, body, auth)
export const deleteBundleDiscount = (id) => apiDelete(`/api/v1/bundle-discounts/${id}`, auth)
