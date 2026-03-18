import { prisma } from '@/lib/db';
import { TIER_CREDITS } from './stripe';

// Reset credits monthly if needed
export async function resetCreditsIfNeeded(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, lastCreditReset: true, credits: true },
  });
  if (!user) return;

  const now = new Date();
  const lastReset = new Date(user.lastCreditReset);
  const monthDiff = (now.getFullYear() - lastReset.getFullYear()) * 12
    + (now.getMonth() - lastReset.getMonth());

  if (monthDiff >= 1) {
    const maxCredits = TIER_CREDITS[user.subscriptionTier as keyof typeof TIER_CREDITS] ?? 3;
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: maxCredits === -1 ? -1 : maxCredits,
        lastCreditReset: now,
      },
    });
  }
}

// Check if user has credits (unlimited = -1 means always ok)
export async function hasCredits(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user) return false;

  await resetCreditsIfNeeded(userId);

  // Re-fetch after potential reset
  const refreshed = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return (refreshed?.credits ?? 0) === -1 || (refreshed?.credits ?? 0) > 0;
}

// Consume 1 credit
export async function consumeCredit(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user) throw new Error('User not found');

  if (user.credits === -1) return; // unlimited
  if (user.credits <= 0) throw new Error('No credits remaining');

  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: 1 } },
  });
}

// Refund credit on audit error
export async function refundCredit(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user) return;
  if (user.credits === -1) return; // unlimited, nothing to refund

  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: 1 } },
  });
}

// Get user's current credits info
export async function getCreditsInfo(userId: string) {
  await resetCreditsIfNeeded(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      creditsPerMonth: true,
      subscriptionTier: true,
    },
  });
  if (!user) return null;

  return {
    credits: user.credits,
    creditsPerMonth: user.creditsPerMonth,
    subscriptionTier: user.subscriptionTier,
    isUnlimited: user.credits === -1,
  };
}
