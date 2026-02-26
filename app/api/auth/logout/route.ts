import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { withApiLogging } from '@/lib/api-logging';
export const POST = withApiLogging(async async request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return NextResponse.json({ success: true });
}
