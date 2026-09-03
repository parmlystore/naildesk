// NailDesk — Stripe Webhook
// Listens for checkout.session.completed and unlocks the exact studio that
// paid — identified by client_reference_id set when the session was created.
// One payment can only ever unlock the one studio it was created for.
// Requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL and
// SUPABASE_SERVICE_KEY as Vercel environment variables.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function buffer(readable) {
return new Promise((resolve, reject) => {
const chunks = [];
readable.on('data', (chunk) => chunks.push(chunk));
readable.on('end', () => resolve(Buffer.concat(chunks)));
readable.on('error', reject);
});
}

export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

const sig = req.headers['stripe-signature'];
let event;

try {
const rawBody = await buffer(req);
event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
} catch (e) {
console.error('Webhook signature verification failed:', e.message);
return res.status(400).json({ error: `Webhook Error: ${e.message}` });
}

if (event.type === 'checkout.session.completed') {
const session = event.data.object;
const studioId = session.client_reference_id;
const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
const tier = session.metadata?.tier || null;

if (!studioId) {
console.error('Webhook: checkout session had no client_reference_id, skipping.');
return res.status(200).json({ received: true, skipped: true });
}

const { error } = await supabase
.from('studios')
.update({ unlocked: true, stripe_customer_id: stripeCustomerId, tier })
.eq('id', studioId);

if (error) {
console.error('Webhook: failed to unlock studio', studioId, error);
return res.status(500).json({ error: 'Failed to unlock studio' });
}
}

return res.status(200).json({ received: true });
}
