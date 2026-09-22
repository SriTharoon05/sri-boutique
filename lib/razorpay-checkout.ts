'use client';

export interface CheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

let checkoutScript: Promise<void> | null = null;

export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScript) return checkoutScript;
  checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const timer = window.setTimeout(fail, 15000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      checkoutScript = null;
      reject(new Error('Unable to load secure checkout. Check your connection and try again.'));
    }
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.Razorpay) resolve(); else fail();
    };
    script.onerror = fail;
    document.body.appendChild(script);
  });
  return checkoutScript;
}
