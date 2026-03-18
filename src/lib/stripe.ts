import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// ─── Product / Price IDs (set via env) ─────────────────────────────────────
export const PRICE_IDS = {
  PRO: process.env.STRIPE_PRO_PRICE_ID || '',
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
} as const;

export const TIER_CREDITS = {
  FREE: 3,
  PRO: 30,
  ENTERPRISE: -1, // -1 = unlimited
} as const;

export const TIER_PRICES = {
  FREE: 0,
  PRO: 29,
  ENTERPRISE: 99,
} as const;

// Lazy Stripe client — only created when actually used
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required for billing features.');
    }
    _stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return _stripe;
}
