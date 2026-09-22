// Reserved identity, not a client-controlled checkout bypass flag.
export const PAYMENT_TEST_PRODUCT_ID = 'a214e165-6df2-4e31-bc87-aed605ff0101';
export const PAYMENT_TEST_VARIANT_ID = 'a214e165-6df2-4e31-bc87-aed605ff0102';
export const PAYMENT_TEST_SLUG = 'payment-test-one-rupee';
export function isPaymentTestCart(items: { variant?: { product?: { id?: string } | null } | null }[]) {
  return items.length === 1 && items[0].variant?.product?.id === PAYMENT_TEST_PRODUCT_ID;
}
