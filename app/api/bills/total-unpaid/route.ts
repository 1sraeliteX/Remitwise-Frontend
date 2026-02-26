import { NextRequest, NextResponse } from 'next/server';
import { getTotalUnpaid, getUnpaidBills } from '@/lib/contracts/bill-payments';
import { jsonSuccess, jsonError } from '@/lib/api/types';

import { withApiLogging } from '@/lib/api-logging';
export const GET = withApiLogging(async async request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token || token !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const owner = new URL(request.url).searchParams.get('owner') ?? token;

    const [total, bills] = await Promise.all([
      getTotalUnpaid(owner),
      getUnpaidBills(owner),
    ]);

    return jsonSuccess({
      totalUnpaid: total,
      count: bills.length,
      bills,
    });
  } catch (err) {
    console.error('[GET /api/bills/total-unpaid]', err);
    return jsonError('INTERNAL_ERROR', 'Failed to fetch total unpaid bills');
  }
}