import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import crypto from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    if (signature !== expectedSignature) {
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
      const orderId = payment.order_id;

      // Find the order by Razorpay order ID (stored in metadata or notes)
      // We need to find order by matching razorpay_order_id or from notes
      const orderNumber = payment.notes?.order_number;

      if (!orderNumber && !orderId) {
        console.error("No order identifier in webhook payload");
        return new Response(
          JSON.stringify({ error: "No order identifier" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try to find order by payment_id being null and update
      // The order_number is in format SB-YYYY-XXXXXX
      const { data: orders, error: findError } = await supabase
        .from("orders")
        .select("id, status, user_id")
        .eq("status", "pending")
        .is("payment_id", null)
        .limit(1);

      if (payment.notes?.order_id) {
        // Direct order ID from notes
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_status: "success",
            payment_id: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.notes.order_id);

        if (updateError) {
          console.error("Error updating order:", updateError);
        }
      }

      console.log(`Payment captured: ${payment.id}`);
    }

    // Handle payment.failed event
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      console.log(`Payment failed: ${payment.id}`);

      if (payment.notes?.order_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            payment_id: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.notes.order_id);
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
