# API Logging Documentation

## Overview

This document describes the structured API logging system implemented for Remitwise-Frontend. The logging middleware captures request/response metadata in a secure, structured JSON format while preventing any sensitive data from being logged.

## Log Format

All API logs are emitted as structured JSON to stdout with the following schema:

```json
{
  "level": "info|error|warn",
  "event": "api_request",
  "method": "GET|POST|PUT|DELETE|PATCH",
  "path": "/api/example",
  "statusCode": 200,
  "durationMs": 143,
  "requestId": "req_abc123",
  "responseSizeBytes": 1024,
  "bodySizeBytes": 512,
  "addressPrefix": "GABCD1",
  "contentType": "application/json",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100",
  "error": "Error message (if applicable)"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `level` | string | Log level: `info` (success), `warn` (4xx errors), `error` (5xx errors) |
| `event` | string | Always `api_request` for API logs |
| `method` | string | HTTP method (GET, POST, PUT, DELETE, PATCH) |
| `path` | string | API endpoint path (e.g., `/api/auth/login`) |
| `statusCode` | number | HTTP response status code |
| `durationMs` | number | Request processing duration in milliseconds |
| `requestId` | string | Optional request ID from `x-request-id` header |
| `responseSizeBytes` | number | Response body size in bytes (if available) |
| `bodySizeBytes` | number | Request body size in bytes (if available) |
| `addressPrefix` | string | First 6 characters of Stellar addresses (safe) |
| `contentType` | string | Request Content-Type header |
| `userAgent` | string | Request User-Agent header |
| `ip` | string | Client IP address |
| `error` | string | Error message (only for error/warn levels) |

## Security & Sanitization

### What IS Logged

- HTTP method and path
- Status codes and timing
- Request/response sizes
- Non-sensitive headers (Content-Type, User-Agent)
- IP addresses
- First 6 characters of Stellar addresses (safe prefix)
- Request IDs for correlation

### What is NOT Logged

- Full request bodies
- Passwords, tokens, or secrets
- Signatures or private keys
- Complete Stellar addresses
- Authorization headers
- Any sensitive request parameters

### Address Prefix Logic

For Stellar addresses, only the first 6 characters are logged (e.g., `GABCD1`). This is safe because:
- Only reveals the address prefix
- Cannot be used to reconstruct the full address
- Helps operations teams identify address patterns without exposing sensitive data

## Request Correlation

Use the `requestId` field to correlate logs across multiple requests:

1. **Client**: Include `x-request-id` header in API requests
2. **Logs**: All logs for that request will include the same `requestId`
3. **Example**:
   ```bash
   # Filter logs by request ID
   grep '"requestId":"req_abc123"' /var/log/app.log
   ```

## Environment Configuration

### Production Logging
- Logs are automatically enabled in production (`NODE_ENV=production`)
- All API requests are logged with structured JSON

### Development Logging
- Enable with environment variable: `ENABLE_API_LOGGING=true`
- Disabled by default to reduce noise during development

### Example Environment Setup
```bash
# Production (auto-enabled)
NODE_ENV=production

# Development (manual enable)
NODE_ENV=development
ENABLE_API_LOGGING=true
```

## Log Examples

### Successful Request
```json
{
  "level": "info",
  "event": "api_request",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "durationMs": 143,
  "requestId": "req_abc123",
  "responseSizeBytes": 256,
  "bodySizeBytes": 128,
  "addressPrefix": "GABCD1",
  "contentType": "application/json",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "ip": "192.168.1.100"
}
```

### Error Response
```json
{
  "level": "error",
  "event": "api_request",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 500,
  "durationMs": 89,
  "requestId": "req_def456",
  "responseSizeBytes": 64,
  "bodySizeBytes": 128,
  "contentType": "application/json",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "ip": "192.168.1.100",
  "error": "Invalid signature"
}
```

### Warning Response (4xx)
```json
{
  "level": "warn",
  "event": "api_request",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 401,
  "durationMs": 45,
  "requestId": "req_ghi789",
  "responseSizeBytes": 64,
  "bodySizeBytes": 128,
  "contentType": "application/json",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "ip": "192.168.1.100",
  "error": "Invalid or expired nonce"
}
```

## Implementation Details

### Middleware Integration

The logging middleware is applied to all API routes using the `withApiLogging` wrapper:

```typescript
import { withApiLogging } from '@/lib/api-logging';

export const POST = withApiLogging(async (request: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ success: true });
});
```

### Performance Considerations

- Uses high-resolution timers (`process.hrtime.bigint()`) for accurate timing
- Minimal overhead: only extracts metadata, doesn't buffer full bodies
- Async operations are non-blocking
- Logs are emitted asynchronously to stdout

### Error Handling

- Catches and logs all errors thrown by route handlers
- Ensures logs are emitted even when handlers fail
- Provides consistent error responses (500 status)
- Never leaks sensitive error details in logs

## Log Analysis

### Common Queries

1. **Find slow requests** (>1000ms):
   ```bash
   jq 'select(.durationMs > 1000)' /var/log/app.log
   ```

2. **Error rate by endpoint**:
   ```bash
   jq -r '.path + " " + .level' /var/log/app.log | sort | uniq -c
   ```

3. **Request volume over time**:
   ```bash
   jq -r '"\(.level) \(.path)"' /var/log/app.log | sort | uniq -c | sort -nr
   ```

4. **Find requests by IP**:
   ```bash
   jq 'select(.ip == "192.168.1.100")' /var/log/app.log
   ```

### Monitoring Dashboards

Key metrics to monitor:
- Request rate by endpoint
- Response time percentiles (p50, p95, p99)
- Error rate (4xx vs 5xx)
- Response size distribution
- Geographic distribution (by IP)

## Troubleshooting

### Logs Not Appearing

1. Check environment variables:
   ```bash
   echo $NODE_ENV
   echo $ENABLE_API_LOGGING
   ```

2. Verify middleware is applied:
   - Look for `withApiLogging` wrapper in route files
   - Check imports: `import { withApiLogging } from '@/lib/api-logging'`

3. Test with curl:
   ```bash
   curl -H "x-request-id: test-123" http://localhost:3000/api/health
   ```

### Performance Issues

- Monitor `durationMs` field for slow requests
- Check for large `responseSizeBytes` values
- Verify no sensitive data is being logged accidentally

### Security Concerns

- Review logs for any sensitive data leakage
- Verify address prefixes are only 6 characters
- Ensure no full request bodies are logged
- Check that Authorization headers are not captured

## Migration Guide

### Adding Logging to New Routes

1. Import the logging middleware:
   ```typescript
   import { withApiLogging } from '@/lib/api-logging';
   ```

2. Wrap your handler:
   ```typescript
   export const POST = withApiLogging(async (request: NextRequest) => {
     // Your existing logic
   });
   ```

### Removing Logging (if needed)

Set environment variables to disable:
```bash
NODE_ENV=development
# Don't set ENABLE_API_LOGGING
```

## Support

For issues or questions about the API logging system:
1. Check this documentation first
2. Review the implementation in `lib/api-logging.ts`
3. Test with the health endpoint: `GET /api/health`
4. Check environment configuration
