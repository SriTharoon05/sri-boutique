import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import crypto from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://api.razorpay.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Razorpay-Signature",
};

async function sendOrderEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  toEmail: string
) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      to: toEmail,
      subject: `Order Confirmed - ${order.order_number}`,
      orderNumber: order.order_number,
      total: order.total,
      items: (order.items || []).map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.price_at_purchase,
      })),
      shippingAddress: order.shipping_address,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`send-order-email returned ${res.status}: ${errText}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) {
      console.error("RAZORPAY_KEY_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const signaturesMatch = Boolean(signature)
      && signature!.length === expectedSignature.length
      && crypto.timingSafeEqual(
        new TextEncoder().encode(signature!),
        new TextEncoder().encode(expectedSignature),
      );

    if (!signaturesMatch) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(body);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle payment.captured event
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.order_id;

      if (!orderId) {
        console.error("No order_id in payment notes — cannot process webhook");
        return new Response(
          JSON.stringify({ error: "No order identifier" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark paid idempotently — fine if the client-side verify route
      // already did this first.
      const { data: existingOrder, error: fetchError } = await supabase
        .from("orders")
        .select("id, status, user_id, total, razorpay_order_id")
        .eq("id", orderId)
        .maybeSingle();

      if (fetchError || !existingOrder) {
        console.error("Order not found for webhook:", orderId, fetchError);
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!existingOrder.razorpay_order_id
        || payment.order_id !== existingOrder.razorpay_order_id
        || Number(payment.amount) !== Math.round(Number(existingOrder.total) * 100)) {
        console.error("Payment/order binding check failed", orderId);
        return new Response(
          JSON.stringify({ error: "Payment does not match order" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingOrder.status !== "paid") {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_status: "success",
            payment_id: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        if (updateError) {
          console.error("Error updating order:", updateError);
        }
      }


      const { data: userCart } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", existingOrder.user_id)
        .maybeSingle();
      if (userCart) await supabase.from("cart_items").delete().eq("cart_id", userCart.id);

      // Claim the right to send the confirmation email. This atomic
      // conditional update only affects a row (and only returns one) if
      // email_sent is still false right now. Whichever process — this
      // webhook or the client-side /api/payments/verify route — wins this
      // race sends the email; the other sees 0 rows affected and skips it.
      const { data: claimedOrder, error: claimError } = await supabase
        .from("orders")
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("email_sent", false)
        .select("id")
        .maybeSingle();

      if (claimError) {
        console.error("Error claiming email-send right:", claimError);
      }

      if (claimedOrder) {
        // We won the claim — fetch full order + user email and send it.
        const { data: fullOrder, error: orderFetchError } = await supabase
          .from("orders")
          .select(`*, items:order_items (*)`)
          .eq("id", orderId)
          .single();

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          existingOrder.user_id
        );

        if (orderFetchError || userError || !userData?.user?.email) {
          console.error(
            "Could not load order/user for email:",
            orderFetchError,
            userError
          );
        } else {
          try {
            await sendOrderEmail(supabaseUrl, supabaseServiceKey, fullOrder, userData.user.email);
            console.log(`Order confirmation email sent for order ${orderId}`);
          } catch (emailErr) {
            console.error("Failed to send order email from webhook:", emailErr);
            // Release the claim so the client-verify path can retry it.
            await supabase
              .from("orders")
              .update({ email_sent: false, email_sent_at: null })
              .eq("id", orderId);
          }
        }
      }

      console.log(`Payment captured: ${payment.id}`);
    }

    // Handle payment.failed event
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      console.log(`Payment failed: ${payment.id}`);

      if (payment.notes?.order_id) {
        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            payment_id: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.notes.order_id)
          .eq("razorpay_order_id", payment.order_id);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
