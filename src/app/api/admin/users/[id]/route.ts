import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const err = await requireAdmin(req);
  if (err) return err;

  const { id } = await params;

  // Prevent self-deletion
  const auth = req.headers.get('authorization');
  if (auth) {
    const { default: jwt } = await import('jsonwebtoken');
    const token = auth.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || '') as { userId: string };
    if (payload.userId === id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const err = await requireAdmin(req);
  if (err) return err;

  const { id } = await params;
  const body = await req.json();
  const { role, credits } = body;

  const updateData: Record<string, unknown> = {};
  if (role) updateData.role = role;
  if (typeof credits === 'number') updateData.credits = credits;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, role: true, credits: true },
  });

  return NextResponse.json(user);
}
