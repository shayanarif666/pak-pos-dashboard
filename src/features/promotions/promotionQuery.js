import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createCoupon,
  getCoupon,
  listCouponRedemptions,
  listCoupons,
  listReviews,
  moderateReview,
  updateCoupon,
  validateCoupon,
} from "../../api/promotions.js"
import { unwrap } from "../../lib/query.js"

export const promotionKeys = {
  all: ["promotions"],
  coupons: (filters = {}) => ["promotions", "coupons", filters],
  coupon: (id) => ["promotions", "coupon", id],
  redemptions: (id) => ["promotions", "coupon", id, "redemptions"],
  reviews: (filters = {}) => ["promotions", "reviews", filters],
}

export function useInvalidatePromotions() {
  const queryClient = useQueryClient()
  return function invalidatePromotions() {
    return queryClient.invalidateQueries({ queryKey: promotionKeys.all })
  }
}

export function useCouponsQuery(filters = {}) {
  return useQuery({
    queryKey: promotionKeys.coupons(filters),
    queryFn: async () => unwrap(await listCoupons(filters)) || [],
  })
}

export function useCouponQuery(id, options = {}) {
  return useQuery({
    queryKey: promotionKeys.coupon(id),
    queryFn: async () => unwrap(await getCoupon(id)),
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useCouponRedemptionsQuery(id, options = {}) {
  return useQuery({
    queryKey: promotionKeys.redemptions(id),
    queryFn: async () => unwrap(await listCouponRedemptions(id)) || [],
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useSaveCoupon() {
  const invalidatePromotions = useInvalidatePromotions()
  return useMutation({
    mutationFn: ({ id, body }) => (id ? updateCoupon(id, body) : createCoupon(body)),
    onSuccess: invalidatePromotions,
  })
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (body) => validateCoupon(body),
  })
}

export function useReviewsQuery(filters = {}) {
  return useQuery({
    queryKey: promotionKeys.reviews(filters),
    queryFn: async () => unwrap(await listReviews(filters)) || [],
  })
}

export function useModerateReview() {
  const invalidatePromotions = useInvalidatePromotions()
  return useMutation({
    mutationFn: ({ id, status }) => moderateReview(id, status),
    onSuccess: invalidatePromotions,
  })
}
