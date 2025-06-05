/**
 * Test Sentry Integration
 * 
 * This script sends a test error to Sentry to verify the integration is working.
 * Run with: npx tsx scripts/test-sentry.ts
 */

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry (for script context)
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',
  beforeSend(event) {
    console.log('📤 Sending event to Sentry:', event.event_id);
    return event;
  },
});

async function testSentry() {
  console.log('🧪 Testing Sentry Integration...\n');

  // Check if DSN is configured
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.error('❌ NEXT_PUBLIC_SENTRY_DSN is not set in environment variables');
    process.exit(1);
  }

  console.log('✅ DSN configured:', process.env.NEXT_PUBLIC_SENTRY_DSN);
  console.log('📍 Environment:', process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development');

  try {
    // 1. Test message
    console.log('\n1️⃣ Sending test message...');
    Sentry.captureMessage('Test message from Arcadia', 'info');

    // 2. Test error with context
    console.log('2️⃣ Sending test error with context...');
    
    Sentry.withScope((scope) => {
      scope.setTag('test', true);
      scope.setContext('test_context', {
        script: 'test-sentry.ts',
        timestamp: new Date().toISOString(),
      });
      scope.setUser({
        id: 'test-user-123',
        email: 'test@arcadia.com',
      });

      const testError = new Error('Test error from Arcadia setup verification');
      Sentry.captureException(testError);
    });

    // 3. Test breadcrumbs
    console.log('3️⃣ Testing breadcrumbs...');
    
    Sentry.addBreadcrumb({
      message: 'Test script started',
      category: 'test',
      level: 'info',
    });

    Sentry.addBreadcrumb({
      message: 'About to throw test error',
      category: 'test',
      level: 'warning',
    });

    // 4. Test unhandled error
    console.log('4️⃣ Testing error with stack trace...');
    
    try {
      // This will create a nice stack trace
      function problematicFunction() {
        throw new Error('Intentional test error with stack trace');
      }
      
      function callProblematic() {
        problematicFunction();
      }
      
      callProblematic();
    } catch (error) {
      Sentry.captureException(error);
    }

    // Give Sentry time to send events
    console.log('\n⏳ Waiting for events to be sent...');
    await Sentry.flush(5000);

    console.log('\n✅ Test completed successfully!');
    console.log('\n📊 Check your Sentry dashboard at:');
    console.log(`   https://sentry.io/organizations/${process.env.SENTRY_ORG}/issues/`);
    console.log('\nYou should see:');
    console.log('   - 1 info message');
    console.log('   - 2 error events');
    console.log('   - User context and tags');
    console.log('   - Breadcrumbs in the errors');

  } catch (error) {
    console.error('❌ Failed to test Sentry:', error);
    process.exit(1);
  }
}

// Run the test
testSentry();