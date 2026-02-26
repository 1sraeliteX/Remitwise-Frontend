import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/api-logging';

// Mock console.log to capture log output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('API Logging Middleware', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    vi.clearAllMocks();
  });

  it('should log successful API requests', async () => {
    // Mock environment
    vi.stubEnv('NODE_ENV', 'production');

    // Create a mock handler that returns success
    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true }, { status: 200 })
    );

    // Create mock request
    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'test-123',
        'user-agent': 'test-agent',
      },
      body: JSON.stringify({ test: 'data' }),
    });

    // Apply middleware
    const wrappedHandler = withApiLogging(mockHandler);
    const response = await wrappedHandler(mockRequest);

    // Verify handler was called
    expect(mockHandler).toHaveBeenCalledWith(mockRequest);
    expect(response.status).toBe(200);

    // Verify log was emitted
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"event":"api_request"')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"method":"POST"')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"path":"/api/test"')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":200')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"requestId":"test-123"')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"level":"info"')
    );
  });

  it('should log error responses', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    // Mock handler that throws an error
    const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));

    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });

    const wrappedHandler = withApiLogging(mockHandler);
    const response = await wrappedHandler(mockRequest);

    expect(response.status).toBe(500);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"level":"error"')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":500')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"error":"Test error"')
    );
  });

  it('should log warning for 4xx responses', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );

    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });

    const wrappedHandler = withApiLogging(mockHandler);
    const response = await wrappedHandler(mockRequest);

    expect(response.status).toBe(404);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"level":"warn"')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":404')
    );
  });

  it('should not log in development unless ENABLE_API_LOGGING is true', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_API_LOGGING', 'false');

    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });

    const wrappedHandler = withApiLogging(mockHandler);
    await wrappedHandler(mockRequest);

    expect(mockConsoleLog).not.toHaveBeenCalled();
  });

  it('should log in development when ENABLE_API_LOGGING is true', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_API_LOGGING', 'true');

    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });

    const wrappedHandler = withApiLogging(mockHandler);
    await wrappedHandler(mockRequest);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"event":"api_request"')
    );
  });

  it('should extract address prefix from Stellar addresses', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        address: 'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        publicKey: 'GXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV'
      }),
    });

    const wrappedHandler = withApiLogging(mockHandler);
    await wrappedHandler(mockRequest);

    // Should extract the first address found (GABCD1)
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('"addressPrefix":"GABCD1"')
    );
  });

  it('should not log sensitive data', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        password: 'secret123',
        token: 'jwt-token-secret',
        signature: 'signature-data',
        address: 'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      }),
    });

    const wrappedHandler = withApiLogging(mockHandler);
    await wrappedHandler(mockRequest);

    const logOutput = mockConsoleLog.mock.calls[0][0];
    
    // Should not contain sensitive data
    expect(logOutput).not.toContain('secret123');
    expect(logOutput).not.toContain('jwt-token-secret');
    expect(logOutput).not.toContain('signature-data');
    
    // Should only contain safe address prefix
    expect(logOutput).toContain('GABCD1');
    expect(logOutput).not.toContain('GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });

  it('should measure duration accurately', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockHandler = vi.fn().mockImplementation(async () => {
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 10));
      return NextResponse.json({ success: true });
    });

    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });

    const wrappedHandler = withApiLogging(mockHandler);
    await wrappedHandler(mockRequest);

    const logOutput = mockConsoleLog.mock.calls[0][0];
    const logEntry = JSON.parse(logOutput);
    
    expect(logEntry.durationMs).toBeGreaterThan(0);
    expect(logEntry.durationMs).toBeLessThan(1000); // Should be reasonable
  });

  it('should handle missing request ID gracefully', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    const mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      // No x-request-id header
    });

    const wrappedHandler = withApiLogging(mockHandler);
    await wrappedHandler(mockRequest);

    const logOutput = mockConsoleLog.mock.calls[0][0];
    const logEntry = JSON.parse(logOutput);
    
    expect(logEntry.requestId).toBeUndefined();
  });
});
