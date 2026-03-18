import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { TIER_CREDITS } from '@/lib/stripe';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const tierPrices: Record<string, number> = { PRO: 29, ENTERPRISE: 99 };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;
        if (!userId || !tier) break;

        const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'active',
            subscriptionTier: tier,
            stripeSubscriptionId: subscription.id,
            credits: TIER_CREDITS[tier as keyof typeof TIER_CREDITS] ?? 3,
            creditsPerMonth: TIER_CREDITS[tier as keyof typeof TIER_CREDITS] ?? 3,
          },
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subId = (invoice as any).subscription as string | undefined
          ?? (invoice as any).subscription?.id as string | undefined;
        if (!subId) break;

        const subscription = await getStripe().subscriptions.retrieve(subId);
        const tier = (subscription.metadata?.tier || 'PRO') as keyof typeof TIER_CREDITS;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: 'active',
              credits: TIER_CREDITS[tier] ?? 3,
              creditsPerMonth: TIER_CREDITS[tier] ?? 3,
              lastCreditReset: new Date(),
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subId = (invoice as any).subscription as string | undefined
          ?? (invoice as any).subscription?.id as string | undefined;
        if (!subId) break;

        const subscription = await getStripe().subscriptions.retrieve(subId);
        const userId = subscription.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: 'past_due' },
          });
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          if (event.type === 'customer.subscription.deleted') {
            await prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionStatus: 'canceled',
                subscriptionTier: 'FREE',
                stripeSubscriptionId: null,
                credits: 3,
                creditsPerMonth: 3,
              },
            });
          } else {
            // subscription updated (e.g., tier change)
            const tier = (subscription.metadata?.tier || 'FREE') as keyof typeof TIER_CREDITS;
            await prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionStatus: subscription.status,
                subscriptionTier: tier,
                credits: TIER_CREDITS[tier] ?? 3,
                creditsPerMonth: TIER_CREDITS[tier] ?? 3,
              },
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
