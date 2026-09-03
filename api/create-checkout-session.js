// NailDesk — Create Stripe Checkout Session
// Called from the dashboard's locked/payment screen. Ties the payment to one
// specific studio via client_reference_id, so the webhook can only ever
// unlock that exact account — never a different or duplicate signup.
// Requires STRIPE_SECRET_KEY as a Vercel environment variable.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const TIER_PRICES = {
basic: { amount: 39900, label: 'Basic' },
pro: { amount: 79900, label: 'Pro' },
};

export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

const { studioId, tier, ownerEmail } = req.body || {};

if (!studioId || !tier || !TIER_PRICES[tier]) {
return res.status(400).json({ error: 'Missing or invalid studioId/tier' });
}

const { amount, label } = TIER_PRICES[tier];
const origin = `https://${req.headers.host}`;

try {
const session = await stripe.checkout.sessions.create({
mode: 'payment',
client_reference_id: studioId,
customer_email: ownerEmail || undefined,
line_items: [
{
price_data: {
currency: 'aud',
product_data: { name: `NailDesk — ${label} plan` },
unit_amount: amount,
},
quantity: 1,
},
],
metadata: { studioId, tier },
success_url: `${origin}/login?checkout=success`,
cancel_url: `${origin}/login?checkout=cancelled`,
});

return res.status(200).json({ url: session.url });
} catch (e) {
console.error('Stripe checkout session error:', e);
return res.status(500).json({ error: 'Failed to start checkout' });
}
}
