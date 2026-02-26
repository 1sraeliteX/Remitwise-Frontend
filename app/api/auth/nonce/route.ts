import { NextRequest, NextResponse } from "next/server";
import { setNonce } from "@/lib/auth-cache";
import { randomBytes } from "crypto";

import { withApiLogging } from '@/lib/api-logging';
export const POST = withApiLogging(async (request: NextRequest) => {
  const { publicKey } = await request.json();

  if (!publicKey) {
    return NextResponse.json(
      { error: "publicKey is required" },
      { status: 400 },
    );
  }

  // Generate a random nonce (32 bytes) and convert to hex
  const nonceBuffer = randomBytes(32);
  const nonce = nonceBuffer.toString("hex");

  // Store nonce in cache for later verification
  setNonce(publicKey, nonce);

  return NextResponse.json({ nonce });
});
