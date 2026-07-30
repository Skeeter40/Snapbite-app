import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ error: "PRICE_ID_MISSING: " + JSON.stringify(process.env.STRIPE_PRICE_ID) });
      }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/?success=true`,
      cancel_url: `${process.env.APP_URL}/?canceled=true`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
