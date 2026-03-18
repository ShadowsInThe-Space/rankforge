import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;

  const [
    totalUsers,
    totalAudits,
    recentSignups,
    auditsByStatus,
    avgScore,
    recentAudits,
    mrr,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.audit.count(),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.audit.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.audit.aggregate({
      where: { score: { not: null } },
      _avg: { score: true },
    }),
    prisma.audit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { email: true, name: true } } },
    }),
    // Stripe MRR estimate
    prisma.user.findMany({
      where: { subscriptionStatus: 'active' },
      select: { subscriptionTier: true },
    }),
  ]);

  const tierPrices: Record<string, number> = { PRO: 29, ENTERPRISE: 99 };
  const mrrEstimate = mrr.reduce(
    (sum, u) => sum + (tierPrices[u.subscriptionTier] || 0),
    0
  );

  const statusMap = Object.fromEntries(auditsByStatus.map(s => [s.status, s._count]));
  const errorRate =
    totalAudits > 0
      ? Math.round(((statusMap['error'] || 0) / totalAudits) * 100)
      : 0;

  return NextResponse.json({
    totalUsers,
    totalAudits,
    recentSignups,
    avgScore: Math.round(avgScore._avg.score || 0),
    errorRate,
    mrr: mrrEstimate,
    statusBreakdown: statusMap,
    recentAudits: recentAudits.map(a => ({
      id: a.id,
      domain: a.domain,
      status: a.status,
      score: a.score,
      grade: a.grade,
      createdAt: a.createdAt,
      user: a.user,
    })),
  });
}
