import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { buildInitializeSplitTx } from '@/lib/contracts/remittance-split';
import { SplitPercentages, ValidationError } from '@/lib/validation/percentages';

import { withApiLogging } from '@/lib/api-logging';
export const POST = withApiLogging(async async request: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getSession(request);
    
    if (!session || !session.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body: SplitPercentages;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // 3. Extract percentages
    const { spending, savings, bills, insurance } = body;

    // 4. Build transaction using session address as owner
    const result = await buildInitializeSplitTx(
      session.address,
      { spending, savings, bills, insurance },
      { simulate: true } // Include simulation for cost estimation
    );

    // 5. Return success response
    return NextResponse.json({
      success: true,
      xdr: result.xdr,
      simulate: result.simulate,
      message: 'Transaction built successfully. Please sign with your wallet and submit to the network.',
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Handle other errors
    console.error('Initialize split error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
