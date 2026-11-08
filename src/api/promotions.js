import { apiGet, apiPatch, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listCustomerCredit(customerId) {
  return apiGet(`/api/v1/customers/${customerId}/credit`, auth)
}

export function addCustomerCredit(customerId, body) {
  return apiPost(`/api/v1/customers/${customerId}/credit`, body, auth)
}

export function listCoupons(params = {}) {
  return apiGet(withQuery("/api/v1/coupons", params), auth)
}

export function getCoupon(id) {
  return apiGet(`/api/v1/coupons/${id}`, auth)
}

export function createCoupon(body) {
  return apiPost("/api/v1/coupons", body, auth)
}

export function updateCoupon(id, body) {
  return apiPatch(`/api/v1/coupons/${id}`, body, auth)
}

export function validateCoupon(body) {
  return apiPost("/api/v1/coupons/validate", body, auth)
}

export function listCouponRedemptions(id) {
  return apiGet(`/api/v1/coupons/${id}/redemptions`, auth)
}

export function listReviews(params = {}) {
  return apiGet(withQuery("/api/v1/reviews", params), auth)
}

export function moderateReview(id, status) {
  return apiPatch(`/api/v1/reviews/${id}`, { status }, auth)
}
