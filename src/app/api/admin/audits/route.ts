import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  const domain = searchParams.get('domain');
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(domain ? { domain: { contains: domain, mode: 'insensitive' as const } } : {}),
  };

  const [audits, total] = await Promise.all([
    prisma.audit.findMany({
      where,
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.audit.count({ where }),
  ]);

  return NextResponse.json({ audits, total, pages: Math.ceil(total / limit), page });
}

export async function DELETE(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await prisma.audit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
