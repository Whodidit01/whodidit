// app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";

// Force Node runtime (Stripe does NOT work on the Edge runtime)
export const runtime = "nodejs";
// Avoid caching this route
export const dynamic = "force-dynamic";

const secret = process.env.STRIPE_SECRET_KEY;
// If you use TS, the non-null assertion `!` is fine because we guard below.
const stripe = new Stripe(secret!, { apiVersion: "2024-06-20" });

export async function POST(req: NextRequest) {
  try {
    if (!secret) {
      return NextResponse.json({ error: "Stripe secret key not set" }, { status: 500 });
    }

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer") ||
      "http://localhost:3000";

    const body = await req.json();
    const {
      amountCents,
      providerId,
      service,
      customerEmail,
      customerName,
    } = body ?? {};

    if (!amountCents || Number.isNaN(Number(amountCents)) || amountCents < 50) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // With latest API versions, you can omit payment_method_types entirely (default includes card).
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Resolve: ${service || "Service"}`,
              metadata: {
                providerId: providerId || "",
              },
            },
            unit_amount: Math.round(Number(amountCents)),
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail || undefined,
      metadata: {
        providerId: providerId || "",
        service: service || "",
        customerName: customerName || "",
        source: "resolve_checkout",
      },
      success_url: `${origin.replace(/\/$/, "")}/help?paid=1`,
      cancel_url: `${origin.replace(/\/$/, "")}/resolve?canceled=1`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Stripe error", err);
    return NextResponse.json(
      { error: err?.message || "Stripe error" },
      { status: 500 }
    );
  }
}
