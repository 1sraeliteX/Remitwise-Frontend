import { getSession } from '../../../../lib/session';

import { withApiLogging } from '@/lib/api-logging';
export const dynamic = 'force-dynamic';

export const GET = withApiLogging(async async ) {
  const session = await getSession();
  if (!session?.address) {
    return Response.json(
      { error: 'Unauthorized', message: 'Not authenticated' },
      { status: 401 }
    );
  }
  return Response.json({ address: session.address });
}
