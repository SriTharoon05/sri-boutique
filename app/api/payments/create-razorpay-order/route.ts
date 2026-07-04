import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId } = await request.json();

    if (!amount || !orderId) {
      return NextResponse.json({ error: 'Missing amount or orderId' }, { status: 400 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      // Return demo response if keys not configured
      return NextResponse.json({
        id: `order_demo_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: 'INR',
        key_id: 'rzp_test_demo',
        demo: true,
      });
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${key_id}:${key_secret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: orderId,
        payment_capture: 1,
        notes: {
          order_id: orderId, // Include order ID for webhook lookup
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Razorpay error:', error);
      return NextResponse.json({ error: 'Failed to create Razorpay order' }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
