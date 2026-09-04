import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Cron-Secret",
};

interface CartItem {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  variant: {
    product: {
      name: string;
      slug: string;
      base_price: number;
    };
    price_override: number | null;
  };
}

interface Cart {
  id: string;
  user_id: string;
  updated_at: string;
  items: CartItem[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // This edge function is designed to be called by a cron job or scheduled trigger
  // It finds abandoned carts (older than 24 hours) and sends reminder emails

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://sriboutique.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find carts that are:
    // 1. Older than 24 hours
    // 2. Belong to logged-in users (user_id is not null)
    // 3. Have items
    // 4. Haven't had an email sent yet (we'll track this with a cart.email_sent_at column - need to add)

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: abandonedCarts, error: cartsError } = await supabase
      .from("carts")
      .select(`
        id,
        user_id,
        updated_at,
        items:cart_items (
          id,
          cart_id,
          variant_id,
          quantity,
          variant:product_variants (
            price_override,
            product:products (
              name,
              slug,
              base_price
            )
          )
        )
      `)
      .not("user_id", "is", null)
      .lt("updated_at", twentyFourHoursAgo.toISOString())
      .gt("updated_at", new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()) // Not older than 72 hours
      .is("abandoned_email_sent_at", null);

    if (cartsError) {
      console.error("Error fetching abandoned carts:", cartsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch carts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No abandoned carts found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured - skipping email send");
      return new Response(
        JSON.stringify({ message: "Email not configured", cartsFound: abandonedCarts.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailsSent = 0;

    for (const cart of abandonedCarts as Cart[]) {
      // Get user email
      const { data: user } = await supabase.auth.admin.getUserById(cart.user_id);
      const email = user?.user?.email;

      if (!email || !cart.items || cart.items.length === 0) continue;

      // Calculate cart total
      const subtotal = cart.items.reduce((sum, item) => {
        const price = item.variant?.price_override ?? item.variant?.product?.base_price ?? 0;
        return sum + price * item.quantity;
      }, 0);

      // Send email via Resend
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Sri Boutique <noreply@sriboutique.com>",
            to: email,
            subject: "You left something in your cart",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #8B3A3A; font-family: serif;">Sri Boutique</h1>
                <p>Hi there,</p>
                <p>We noticed you left some items in your cart. Don't worry, they're still waiting for you!</p>
                <div style="background: #f9f5f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="font-weight: bold; margin-bottom: 10px;">Your Cart (${cart.items.length} items)</p>
                  <p style="font-size: 24px; color: #8B3A3A;">Total: ₹${subtotal.toLocaleString()}</p>
                </div>
                <a href="${siteUrl}/cart" style="display: inline-block; background: #8B3A3A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Complete Your Order</a>
                <p style="margin-top: 20px; color: #666; font-size: 14px;">Free shipping on orders above ₹2,000</p>
              </div>
            `,
          }),
        });

        if (response.ok) {
          // Mark cart as email sent
          await supabase
            .from("carts")
            .update({ abandoned_email_sent_at: new Date().toISOString() })
            .eq("id", cart.id);
          emailsSent++;
        } else {
          console.error("Failed to send email:", await response.text());
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ message: "Abandoned cart emails sent", sent: emailsSent, found: abandonedCarts.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Abandoned cart error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process abandoned carts" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
