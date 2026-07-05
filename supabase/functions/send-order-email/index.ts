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
    country?: string;
  };
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function buildOrderConfirmationEmail(
  { orderNumber, total, items, shippingAddress }: Omit<EmailRequest, "to" | "subject">,
  siteUrl: string
): string {
  const itemRows = items
    .map(
      (item) => `
                <tr>
                  <td style="padding:12px 12px 12px 0; border-bottom:1px solid #f0e8de; font-size:14px; color:#2b211d; vertical-align:top;">
                    ${item.name}
                    <div style="font-size:12px; color:#a89b93; margin-top:2px;">Qty: ${item.quantity}</div>
                  </td>
                  <td align="right" width="90" style="padding:12px 0; border-bottom:1px solid #f0e8de; font-size:14px; color:#2b211d; white-space:nowrap; vertical-align:top;">
                    ${formatINR(item.price * item.quantity)}
                  </td>
                </tr>`
    )
    .join("");

  const addressLine2 = shippingAddress.addressLine2
    ? `${shippingAddress.addressLine2}<br />`
    : "";

  const country = shippingAddress.country || "India";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Sri Boutique Order Confirmation</title>
</head>
<body style="margin:0; padding:0; background-color:#faf6ef; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf6ef; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#fffdfa; border-radius:12px; overflow:hidden; border:1px solid #e8ddd0;">

          <!-- Header -->
          <tr>
            <td style="background-color:#5c2a3a; padding:32px 40px; text-align:center;">
              <p style="margin:0; font-family: Georgia, 'Times New Roman', serif; font-size:26px; font-weight:500; color:#faf6ef; letter-spacing:0.5px;">
                Sri Boutique
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 8px; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; color:#b05c72; font-weight:600;">
                Order Confirmed
              </p>
              <h1 style="margin:0 0 16px; font-family: Georgia, 'Times New Roman', serif; font-size:24px; font-weight:500; color:#2b211d;">
                Thank you for your order
              </h1>
              <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#5a4d47;">
                We've received your order and payment has been confirmed. Here's your summary.
              </p>

              <!-- Order Number Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <div style="display:inline-block; background-color:#f3e9dd; border:1px solid #e8ddd0; border-radius:8px; padding:14px 32px;">
                      <span style="font-family: 'Courier New', monospace; font-size:18px; font-weight:700; letter-spacing:2px; color:#5c2a3a;">
                        ${orderNumber}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Items table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px; table-layout:fixed;">
                <tr>
                  <td></td>
                  <td style="width:90px;"></td>
                </tr>
                ${itemRows}
              </table>

              <!-- Total row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px; table-layout:fixed;">
                <tr>
                  <td></td>
                  <td style="width:90px;"></td>
                </tr>
                <tr>
                  <td style="padding-top:12px; font-size:16px; font-weight:700; color:#2b211d;">
                    Total
                  </td>
                  <td align="right" style="padding-top:12px; font-size:16px; font-weight:700; color:#5c2a3a; white-space:nowrap;">
                    ${formatINR(total)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e8ddd0;"></div>
            </td>
          </tr>

          <!-- Shipping Address -->
          <tr>
            <td style="padding:24px 40px;">
              <p style="margin:0 0 8px; font-size:13px; letter-spacing:1px; text-transform:uppercase; color:#b05c72; font-weight:600;">
                Shipping To
              </p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#5a4d47;">
                ${shippingAddress.fullName}<br />
                ${shippingAddress.addressLine1}<br />
                ${addressLine2}
                ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}<br />
                ${country}
              </p>
            </td>
          </tr>

          <!-- Track order button -->
          <tr>
            <td style="padding:8px 40px 32px; text-align:center;">
              <a href="${siteUrl}/account/orders" style="display:inline-block; background-color:#5c2a3a; color:#faf6ef; font-size:14px; font-weight:600; padding:14px 32px; border-radius:8px; text-decoration:none;">
                Track Your Order
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e8ddd0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#a89b93;">
                Questions? Contact us at sriboutiquestore@gmail.com
              </p>
              <p style="margin:8px 0 0; font-size:12px; color:#a89b93;">
                © ${new Date().getFullYear()} Sri Boutique · Premium Ethnic Wear & Sarees
              </p>
              <p style="margin:8px 0 0; font-size:12px;">
                <a href="${siteUrl}" style="color:#b05c72; text-decoration:none;">sriboutique.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

  // BREVO_API_KEY must be set via: supabase secrets set BREVO_API_KEY=your_key
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://sriboutique.com";

  if (!brevoApiKey) {
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, subject, orderNumber, total, items, shippingAddress } = body;

    const htmlContent = buildOrderConfirmationEmail(
      { orderNumber, total, items, shippingAddress },
      siteUrl
    );

    // Brevo transactional email API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "Sri Boutique",
          email: "orders@sriboutique.com", // must be verified in Brevo's Domains section
        },
        to: [{ email: to }],
        subject: subject || `Order Confirmed - ${orderNumber}`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Brevo error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    return new Response(
      JSON.stringify({ success: true, id: result.messageId }),
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