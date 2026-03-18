import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/admin';
import { getCreditsInfo } from '@/lib/credits';

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const info = await getCreditsInfo(authUser.userId);
  if (!info) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json(info);
}
