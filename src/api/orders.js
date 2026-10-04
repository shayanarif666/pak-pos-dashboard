import { apiGet, apiPost, withQuery } from "../lib/http.js"

const auth = { auth: true }

export function listOrders(params = {}) {
  return apiGet(withQuery("/api/v1/orders", params), auth)
}

export function listCustomOrders(params = {}) {
  return apiGet(withQuery("/api/v1/orders/custom", params), auth)
}

export function listCancelledOrders(params = {}) {
  return apiGet(withQuery("/api/v1/orders/cancelled", params), auth)
}

export function listRefunds(params = {}) {
  return apiGet(withQuery("/api/v1/orders/refunds", params), auth)
}

export function getOrder(id) {
  return apiGet(`/api/v1/orders/${id}`, auth)
}

export function voidOrder(id, body) {
  return apiPost(`/api/v1/orders/${id}/void`, body, auth)
}

export function cancelOrder(id, body) {
  return apiPost(`/api/v1/orders/${id}/cancel`, body, auth)
}

export function refundOrderItem(id, body) {
  return apiPost(`/api/v1/orders/${id}/refund`, body, auth)
}

export function refundEntireOrder(id, body) {
  return apiPost(`/api/v1/orders/${id}/refund/complete`, body, auth)
}

export function getOrderPayments(id) {
  return apiGet(`/api/v1/orders/${id}/payments`, auth)
}

export function addOrderPayment(id, body) {
  return apiPost(`/api/v1/orders/${id}/payments`, body, auth)
}

export function confirmPayment(id) {
  return apiPost(`/api/v1/payments/${id}/confirm`, {}, auth)
}

export function getOrderReceipt(id) {
  return apiGet(`/api/v1/orders/${id}/receipt`, auth)
}

export function getReceipt(id) {
  return apiGet(`/api/v1/receipts/${id}`, auth)
}

export function getRefundReceipt(orderId, refundId) {
  return apiGet(`/api/v1/orders/${orderId}/refunds/${refundId}/receipt`, auth)
}
