import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  orderNumber: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
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

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://sriboutique.com";

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, subject, orderNumber, total, items, shippingAddress } = body;

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toLocaleString()}</td>
      </tr>
    `).join("");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Sri Boutique <orders@sriboutique.com>",
        to,
        subject: subject || `Order Confirmed - ${orderNumber}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0e6dc;">
              <h1 style="color: #8B3A3A; font-family: serif; margin: 0;">Sri Boutique</h1>
            </div>

            <div style="padding: 30px 20px;">
              <h2 style="color: #8B3A3A; font-family: serif;">Thank You for Your Order!</h2>
              <p>We've received your order and will begin processing it shortly.</p>

              <div style="background: #f9f5f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">Order Number</p>
                <p style="margin: 5px 0 0 0; font-size: 20px; color: #8B3A3A;">${orderNumber}</p>
              </div>

              <h3 style="color: #8B3A3A; font-family: serif;">Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f9f5f0;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr>
                    <td colspan="2" style="padding: 15px 0; font-weight: bold; text-align: right;">Total:</td>
                    <td style="padding: 15px 0; font-size: 18px; font-weight: bold; color: #8B3A3A; text-align: right;">₹${total.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <h3 style="color: #8B3A3A; font-family: serif; margin-top: 30px;">Shipping Address</h3>
              <div style="background: #f9f5f0; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; font-weight: bold;">${shippingAddress.fullName}</p>
                <p style="margin: 5px 0;">${shippingAddress.addressLine1}</p>
                ${shippingAddress.addressLine2 ? `<p style="margin: 5px 0;">${shippingAddress.addressLine2}</p>` : ''}
                <p style="margin: 5px 0;">${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}</p>
              </div>

              <div style="margin-top: 30px; text-align: center;">
                <a href="${siteUrl}/account/orders/${orderNumber}" style="display: inline-block; background: #8B3A3A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px;">Track Your Order</a>
              </div>

              <p style="margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
                Questions? Contact us at support@sriboutique.com
              </p>
            </div>

            <div style="background: #8B3A3A; color: white; padding: 20px; text-align: center; font-size: 14px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Sri Boutique. All rights reserved.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
