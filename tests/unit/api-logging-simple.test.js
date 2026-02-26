/**
 * Simple test script for API logging middleware
 * This script can be run directly to verify logging functionality
 */

// Mock console.log to capture output
const originalConsoleLog = console.log;
let capturedLogs = [];

console.log = (...args) => {
  capturedLogs.push(args[0]);
  originalConsoleLog(...args);
};

// Import the logging middleware
const { withApiLogging } = require('../lib/api-logging.ts');

async function testBasicLogging() {
  console.log('🧪 Testing basic API logging...');
  
  // Mock NextRequest and NextResponse
  const mockRequest = {
    method: 'POST',
    url: 'http://localhost:3000/api/test',
    headers: {
      get: (name) => {
        const headers = {
          'x-request-id': 'test-123',
          'content-type': 'application/json',
          'user-agent': 'test-agent',
          'content-length': '100'
        };
        return headers[name.toLowerCase()];
      }
    },
    json: async () => ({ address: 'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ' }),
    clone: () => mockRequest
  };

  const mockResponse = {
    status: 200,
    headers: {
      get: (name) => name === 'content-length' ? '256' : null
    }
  };

  // Mock handler
  const mockHandler = async () => {
    return mockResponse;
  };

  // Test the middleware
  try {
    const wrappedHandler = withApiLogging(mockHandler);
    const response = await wrappedHandler(mockRequest);
    
    console.log('✅ Middleware executed successfully');
    console.log('📊 Captured logs:', capturedLogs.length);
    
    if (capturedLogs.length > 0) {
      const logEntry = JSON.parse(capturedLogs[0]);
      console.log('📝 Log entry:', JSON.stringify(logEntry, null, 2));
      
      // Verify required fields
      const requiredFields = ['event', 'method', 'path', 'statusCode', 'durationMs'];
      const missingFields = requiredFields.filter(field => !(field in logEntry));
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields present');
      } else {
        console.log('❌ Missing fields:', missingFields);
      }
      
      // Verify no sensitive data
      const logString = JSON.stringify(logEntry);
      const sensitivePatterns = [
        'GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', // Full address
        'password', 'token', 'secret', 'signature'
      ];
      
      const foundSensitive = sensitivePatterns.filter(pattern => 
        logString.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (foundSensitive.length === 0) {
        console.log('✅ No sensitive data detected in logs');
      } else {
        console.log('❌ Sensitive data found:', foundSensitive);
      }
      
      // Verify address prefix is safe
      if (logEntry.addressPrefix === 'GABCD1') {
        console.log('✅ Address prefix safely truncated');
      } else {
        console.log('⚠️ Address prefix not found or incorrect');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing middleware:', error.message);
  }
}

async function testErrorLogging() {
  console.log('\n🧪 Testing error logging...');
  capturedLogs = [];
  
  const mockRequest = {
    method: 'GET',
    url: 'http://localhost:3000/api/error-test',
    headers: {
      get: () => null
    }
  };

  // Mock handler that throws error
  const mockHandler = async () => {
    throw new Error('Test error for logging');
  };

  try {
    const wrappedHandler = withApiLogging(mockHandler);
    const response = await wrappedHandler(mockRequest);
    
    if (capturedLogs.length > 0) {
      const logEntry = JSON.parse(capturedLogs[0]);
      if (logEntry.level === 'error' && logEntry.error === 'Test error for logging') {
        console.log('✅ Error logging works correctly');
      } else {
        console.log('❌ Error logging issue:', logEntry);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in error test:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting API logging middleware tests\n');
  
  await testBasicLogging();
  await testErrorLogging();
  
  console.log('\n🏁 Tests completed');
  
  // Restore original console.log
  console.log = originalConsoleLog;
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testBasicLogging, testErrorLogging, runTests };
