// CRITICAL: This router is mounted in index.js BEFORE express.json().
// Webhook uses express.raw() so Stripe signature verification works.
// All other endpoints call express.json() via the router.use() below.
import express, { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../services/supabase.js';
import { stripe, createCheckoutSession, createPortalSession, constructWebhookEvent } from '../services/stripe.js';
import {
  sendPremiumWelcomeEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
} from '../services/resend.js';

const router = Router();

// ── POST /api/stripe/webhook — NO auth, raw body ──────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });

  let event;
  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    await processWebhookEvent(event);
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err.message);
    // Always return 200 — a 4xx/5xx causes Stripe to retry indefinitely
  }

  res.json({ received: true });
});

// All other stripe routes use JSON body parsing
router.use(express.json());

// ── POST /api/stripe/create-checkout-session — requireAuth, free users only ───
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  const { successUrl, cancelUrl } = req.body;
  if (!successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'successUrl and cancelUrl are required' });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', req.user.id)
    .single();

  if (sub?.plan === 'premium' && ['active', 'trialing'].includes(sub.status)) {
    return res.status(409).json({ error: 'User already has an active premium subscription' });
  }

  try {
    const session = await createCheckoutSession(
      req.user.id, req.user.email, successUrl, cancelUrl
    );
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Stripe] Checkout session error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ── POST /api/stripe/create-portal-session — requireAuth ─────────────────────
router.post('/create-portal-session', requireAuth, async (req, res) => {
  const { returnUrl } = req.body;
  if (!returnUrl) return res.status(400).json({ error: 'returnUrl is required' });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', req.user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return res.status(404).json({ error: 'No billing account found for this user' });
  }

  try {
    const session = await createPortalSession(sub.stripe_customer_id, returnUrl);
    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] Portal session error:', err.message);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ── GET /api/stripe/subscription-status — requireAuth ────────────────────────
router.get('/subscription-status', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end, stripe_customer_id')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  res.json(data ?? { plan: 'free', status: 'active' });
});

// ── Webhook event processor ───────────────────────────────────────────────────
async function processWebhookEvent(event) {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') break;
      const subscription = await stripe.subscriptions.retrieve(obj.subscription);
      const userId = subscription.metadata?.supabase_user_id;
      if (!userId) { console.warn('[Stripe] checkout.session.completed: no supabase_user_id in metadata'); break; }
      await upsertSubscription(userId, subscription, obj.customer);
      await sendPremiumWelcomeOnUpgrade(userId).catch(err =>
        console.error('[Stripe] Premium welcome email failed:', err.message)
      );
      break;
    }

    case 'customer.subscription.updated': {
      const userId = obj.metadata?.supabase_user_id;
      if (!userId) { console.warn('[Stripe] subscription.updated: no supabase_user_id in metadata'); break; }
      await upsertSubscription(userId, obj, obj.customer);
      break;
    }

    case 'customer.subscription.deleted': {
      const userId = obj.metadata?.supabase_user_id;
      if (!userId) break;
      const periodEnd = obj.current_period_end
        ? new Date(obj.current_period_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'your billing period end';
      await supabase
        .from('subscriptions')
        .update({ plan: 'free', status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      await sendCancellationEmail(userId, periodEnd).catch(err =>
        console.error('[Stripe] Cancellation email failed:', err.message)
      );
      break;
    }

    case 'invoice.payment_succeeded': {
      if (!obj.subscription) break;
      const sub = await stripe.subscriptions.retrieve(obj.subscription);
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      break;
    }

    case 'invoice.payment_failed': {
      if (!obj.subscription) break;
      const sub = await stripe.subscriptions.retrieve(obj.subscription);
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      const last4 = obj.payment_intent
        ? await getCardLast4(obj.payment_intent).catch(() => '****')
        : '****';
      await sendPaymentFailureEmail(userId, last4).catch(err =>
        console.error('[Stripe] Payment failed email failed:', err.message)
      );
      break;
    }

    default:
      break;
  }
}

// ── Email helper functions ─────────────────────────────────────────────────────

async function getUserProfile(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('email, display_name, natal_chart')
    .eq('id', userId)
    .single();
  return data;
}

async function sendPremiumWelcomeOnUpgrade(userId) {
  const profile = await getUserProfile(userId);
  if (!profile?.email) return;
  const displayName = profile.display_name ?? 'Cosmic Seeker';
  const hasBirthChart = !!(profile.natal_chart && Object.keys(profile.natal_chart).length > 0);
  await sendPremiumWelcomeEmail(profile.email, displayName, hasBirthChart);
}

async function sendCancellationEmail(userId, periodEnd) {
  const profile = await getUserProfile(userId);
  if (!profile?.email) return;
  await sendSubscriptionCancelledEmail(profile.email, profile.display_name ?? 'Cosmic Seeker', periodEnd);
}

async function sendPaymentFailureEmail(userId, last4) {
  const profile = await getUserProfile(userId);
  if (!profile?.email) return;
  const portalUrl = process.env.STRIPE_PORTAL_URL ?? 'https://astrooracle.space/settings';
  await sendPaymentFailedEmail(profile.email, profile.display_name ?? 'Cosmic Seeker', last4, portalUrl);
}

async function getCardLast4(paymentIntentId) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['payment_method'] });
  return pi.payment_method?.card?.last4 ?? '****';
}

// ─────────────────────────────────────────────────────────────────────────────

async function upsertSubscription(userId, subscription, stripeCustomerId) {
  const plan = subscription.items?.data?.[0]?.price?.id === process.env.STRIPE_PRICE_MONTHLY
    ? 'premium'
    : 'free';

  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

export default router;
