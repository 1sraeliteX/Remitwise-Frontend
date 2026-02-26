import { NextRequest, NextResponse } from 'next/server';

interface ApiLogEntry {
  level: 'info' | 'error' | 'warn';
  event: 'api_request';
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId?: string;
  responseSizeBytes?: number;
  bodySizeBytes?: number;
  addressPrefix?: string;
  contentType?: string;
  userAgent?: string;
  ip?: string;
  error?: string;
}

/**
 * Extract safe metadata from request for logging
 * Does NOT log sensitive data like passwords, tokens, or full bodies
 */
function extractRequestMetadata(request: NextRequest): {
  bodySizeBytes?: number;
  addressPrefix?: string;
  contentType?: string;
  userAgent?: string;
  ip?: string;
} {
  const metadata: ReturnType<typeof extractRequestMetadata> = {};

  // Content-Type header
  const contentType = request.headers.get('content-type');
  if (contentType) {
    metadata.contentType = contentType;
  }

  // User-Agent header
  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    metadata.userAgent = userAgent;
  }

  // IP address (from various headers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0].trim() || realIp || '127.0.0.1';
  metadata.ip = ip;

  // Content-Length for body size
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    metadata.bodySizeBytes = parseInt(contentLength, 10);
  }

  return metadata;
}

/**
 * Extract safe metadata from response for logging
 */
function extractResponseMetadata(response: NextResponse): {
  responseSizeBytes?: number;
} {
  const metadata: ReturnType<typeof extractResponseMetadata> = {};

  // Try to get response size from content-length header
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    metadata.responseSizeBytes = parseInt(contentLength, 10);
  }

  return metadata;
}

/**
 * Generate a structured log entry and emit to stdout
 */
function emitLog(entry: ApiLogEntry): void {
  // Only log in production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_API_LOGGING === 'true') {
    console.log(JSON.stringify(entry));
  }
}

/**
 * Extract address prefix from request body if it looks like a Stellar address
 * This is safe - only logs first 6 characters of public addresses
 */
async function extractAddressPrefix(request: NextRequest): Promise<string | undefined> {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return undefined;
    }

    // Clone request to avoid consuming the body
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();

    // Look for common Stellar address field names
    const addressFields = ['address', 'publicKey', 'public_key', 'from', 'to', 'sender', 'receiver'];
    
    for (const field of addressFields) {
      const value = body[field];
      if (typeof value === 'string' && value.startsWith('G') && value.length > 6) {
        return value.substring(0, 6); // Only first 6 characters, safe
      }
    }

    return undefined;
  } catch {
    // If we can't parse the body, just skip address extraction
    return undefined;
  }
}

/**
 * Create API logging middleware wrapper
 * This function wraps API route handlers to add structured logging
 */
export function withApiLogging<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>
) {
  return async (request: T): Promise<NextResponse> => {
    const startTime = process.hrtime.bigint();
    const method = request.method;
    const path = new URL(request.url).pathname;
    const requestId = request.headers.get('x-request-id') || undefined;

    // Extract request metadata (safe, no sensitive data)
    const requestMetadata = extractRequestMetadata(request);
    
    // Extract address prefix if present (safe, only 6 chars)
    const addressPrefix = await extractAddressPrefix(request);

    let response: NextResponse;
    let statusCode = 200;
    let error: string | undefined;

    try {
      // Execute the actual handler
      response = await handler(request);
      statusCode = response.status;
    } catch (err) {
      // Handle any errors thrown by the handler
      statusCode = 500;
      error = err instanceof Error ? err.message : 'Unknown error';
      
      // Create an error response
      response = NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }

    // Calculate duration
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds

    // Extract response metadata
    const responseMetadata = extractResponseMetadata(response);

    // Create and emit log entry
    const logEntry: ApiLogEntry = {
      level: error ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      event: 'api_request',
      method,
      path,
      statusCode,
      durationMs,
      requestId,
      ...requestMetadata,
      ...responseMetadata,
      addressPrefix,
      ...(error && { error }),
    };

    emitLog(logEntry);

    return response;
  };
}

/**
 * Helper function to create a standardized API response with optional logging
 */
export function createApiResponse(
  data: any,
  status: number = 200,
  headers?: Record<string, string>
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}
