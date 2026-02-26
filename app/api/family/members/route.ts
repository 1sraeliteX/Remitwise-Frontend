import { NextRequest, NextResponse } from 'next/server';
import { getAllMembers, buildAddMemberTx } from '@/lib/contracts/family-wallet';
import { AddMemberRequest } from '@/utils/types/family-wallet.types';

import { withApiLogging } from '@/lib/api-logging';
/**
 * GET /api/family/members
 * Get all family members
 * Protected: Requires authentication
 */
export const GET = withApiLogging(async async request: NextRequest) {
    try {
        // TODO: Get session/auth from request
        // const session = await getSession(request);
        // if (!session) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // Contract not yet deployed - return 501
        return NextResponse.json(
            {
                error: 'Not Implemented',
                message: 'Family wallet contract not yet deployed. This endpoint will be available once the contract is deployed.',
                documentation: 'Use getAllMembers(adminAddress?) from lib/contracts/family-wallet.ts'
            },
            { status: 501 }
        );

        // TODO: Uncomment when contract is deployed
        // const adminAddress = request.nextUrl.searchParams.get('admin');
        // const members = await getAllMembers(adminAddress || undefined);
        // return NextResponse.json({ members });

    } catch (error) {
        console.error('Error fetching family members:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/family/members
 * Add a new family member
 * Protected: Requires admin authentication
 */
export const POST = withApiLogging(async async request: NextRequest) {
    try {
        // TODO: Get session/auth from request
        // const session = await getSession(request);
        // if (!session) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }
        // if (session.role !== 'admin') {
        //   return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        // }

        // Contract not yet deployed - return 501
        return NextResponse.json(
            {
                error: 'Not Implemented',
                message: 'Family wallet contract not yet deployed. This endpoint will be available once the contract is deployed.',
                documentation: 'Use buildAddMemberTx(adminAddress, memberAddress, role, spendingLimit) from lib/contracts/family-wallet.ts'
            },
            { status: 501 }
        );

        // TODO: Uncomment when contract is deployed
        // const body: AddMemberRequest = await request.json();
        // 
        // // Validate request body
        // if (!body.address || !body.role || body.spendingLimit === undefined) {
        //   return NextResponse.json(
        //     { error: 'Missing required fields: address, role, spendingLimit' },
        //     { status: 400 }
        //   );
        // }
        //
        // // Validate Stellar address format
        // if (!/^G[A-Z0-9]{55}$/.test(body.address)) {
        //   return NextResponse.json(
        //     { error: 'Invalid Stellar address format' },
        //     { status: 400 }
        //   );
        // }
        //
        // // Validate role
        // if (!['admin', 'sender', 'recipient'].includes(body.role)) {
        //   return NextResponse.json(
        //     { error: 'Invalid role. Must be: admin, sender, or recipient' },
        //     { status: 400 }
        //   );
        // }
        //
        // // Validate spending limit
        // if (body.spendingLimit < 0) {
        //   return NextResponse.json(
        //     { error: 'Spending limit must be non-negative' },
        //     { status: 400 }
        //   );
        // }
        //
        // const txXdr = await buildAddMemberTx(
        //   session.address,
        //   body.address,
        //   body.role,
        //   body.spendingLimit
        // );
        //
        // return NextResponse.json({ 
        //   transactionXdr: txXdr,
        //   message: 'Transaction built successfully. Sign and submit to add member.'
        // });

    } catch (error) {
        console.error('Error adding family member:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
