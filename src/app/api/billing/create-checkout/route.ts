import { NextRequest, NextResponse } from 'next/server';
import { getStripe, PRICE_IDS } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/admin';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tier } = await req.json(); // 'PRO' | 'ENTERPRISE'

  if (!PRICE_IDS[tier as keyof typeof PRICE_IDS]) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const priceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];
  const user = await prisma.user.findUnique({ where: { id: authUser.userId } });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.NEXTAUTH_URL}/profile?upgrade=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/upgrade?canceled=true`,
    metadata: { userId: user.id, tier },
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
  });

  return NextResponse.json({ url: session.url });
}
