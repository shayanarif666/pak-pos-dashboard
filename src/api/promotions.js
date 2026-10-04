import { apiDelete, apiGet, apiPatch, apiPost, apiPut, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listCustomerCredit(customerId) {
  return apiGet(`/api/v1/customers/${customerId}/credit`, auth)
}

export function addCustomerCredit(customerId, body) {
  return apiPost(`/api/v1/customers/${customerId}/credit`, body, auth)
}

export function listOffers(params = {}) {
  return apiGet(withQuery("/api/v1/offers", params), auth)
}

export function getOffer(id) {
  return apiGet(`/api/v1/offers/${id}`, auth)
}

export function createOffer(body) {
  return apiPost("/api/v1/offers", body, auth)
}

export function updateOffer(id, body) {
  return apiPatch(`/api/v1/offers/${id}`, body, auth)
}

export function deactivateOffer(id) {
  return apiDelete(`/api/v1/offers/${id}`, auth)
}

export function listOfferTargets(id) {
  return apiGet(`/api/v1/offers/${id}/targets`, auth)
}

export function replaceOfferTargets(id, targets) {
  return apiPut(`/api/v1/offers/${id}/targets`, { targets }, auth)
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
