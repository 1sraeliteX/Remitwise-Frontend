import { NextRequest, NextResponse } from 'next/server';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { getNonce, deleteNonce } from '@/lib/auth/nonce-store';
import { withApiLogging } from '@/lib/api-logging';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 * Verify a signature and authenticate user
 * 
 * Request Body:
 * - address: Stellar public key
 * - message: The nonce that was signed
 * - signature: Base64-encoded signature
 */
export const POST = withApiLogging(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { address, message, signature } = body;

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: address, message, signature' },
        { status: 400 }
      );
    }

    // Validate Stellar address format
    if (!StrKey.isValidEd25519PublicKey(address)) {
      return NextResponse.json(
        { error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    // Verify nonce exists and hasn't expired
    const storedNonce = getNonce(address);
    if (!storedNonce || storedNonce !== message) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 }
      );
    }

    try {
      // Verify the signature
      const keypair = Keypair.fromPublicKey(address);
      const messageBuffer = Buffer.from(message, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'base64');

      const isValid = keypair.verify(messageBuffer, signatureBuffer);

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      // Delete used nonce (one-time use)
      deleteNonce(address);

      // TODO: Create session/JWT token
      // const token = await createAuthToken(address);

      // Return success with mock token
      return NextResponse.json({
        success: true,
        token: `mock-jwt-${address.substring(0, 10)}`,
        address,
      });

    } catch (verifyError) {
      console.error('Signature verification error:', verifyError);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
