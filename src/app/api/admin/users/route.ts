import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: search
        ? { email: { contains: search, mode: 'insensitive' } }
        : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        creditsPerMonth: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: { select: { audits: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json({
    users: users.map(u => ({
      ...u,
      auditCount: u._count.audits,
      _count: undefined,
    })),
    total,
    pages: Math.ceil(total / limit),
    page,
  });
}
