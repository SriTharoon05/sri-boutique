import 'server-only';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function razorpayCredentials() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error('Payment service is not configured');
  return { key_id, key_secret };
}

export function razorpayClient() {
  return new Razorpay(razorpayCredentials());
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function paymentAmountInPaise(value: unknown) {
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || amount < 100) throw new Error('Invalid order total');
  return amount;
}
