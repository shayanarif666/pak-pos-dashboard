import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createCoupon,
  createOffer,
  deactivateOffer,
  getCoupon,
  getOffer,
  listCouponRedemptions,
  listCoupons,
  listOffers,
  listReviews,
  moderateReview,
  replaceOfferTargets,
  updateCoupon,
  updateOffer,
  validateCoupon,
} from "../../api/promotions.js"
import { unwrap } from "../../lib/query.js"

export const promotionKeys = {
  all: ["promotions"],
  offers: (filters = {}) => ["promotions", "offers", filters],
  offer: (id) => ["promotions", "offer", id],
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

export function useOffersQuery(filters = {}) {
  return useQuery({
    queryKey: promotionKeys.offers(filters),
    queryFn: async () => unwrap(await listOffers(filters)) || [],
  })
}

export function useOfferQuery(id, options = {}) {
  return useQuery({
    queryKey: promotionKeys.offer(id),
    queryFn: async () => unwrap(await getOffer(id)),
    enabled: Boolean(id) && options.enabled !== false,
  })
}

export function useSaveOffer() {
  const invalidatePromotions = useInvalidatePromotions()
  return useMutation({
    mutationFn: async ({ id, body, targets }) => {
      const json = id ? await updateOffer(id, body) : await createOffer(body)
      const offerId = json.data?.id || id
      if (offerId && targets) await replaceOfferTargets(offerId, targets)
      return json
    },
    onSuccess: invalidatePromotions,
  })
}

export function useDeactivateOffer() {
  const invalidatePromotions = useInvalidatePromotions()
  return useMutation({
    mutationFn: (id) => deactivateOffer(id),
    onSuccess: invalidatePromotions,
  })
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
