'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useErrorHandler, 
  useApiErrorHandler, 
  useFormErrorHandler 
} from '@/hooks/useErrorHandler';
import { ErrorFactory } from '@/lib/error-handler';

/**
 * Demo component showing different error handling patterns
 */
export function ErrorHandlerDemo() {
  // Basic error handler
  const basicErrorHandler = useErrorHandler({
    component: 'ErrorHandlerDemo',
    feature: 'BasicErrors',
    showToast: true,
  });

  // API error handler with auto-retry
  const apiErrorHandler = useApiErrorHandler({
    component: 'ErrorHandlerDemo',
    feature: 'ApiErrors',
    autoRetry: true,
    maxRetries: 2,
  });

  // Form error handler
  const formErrorHandler = useFormErrorHandler('DemoForm');

  // Test different error types
  const testBasicError = () => {
    basicErrorHandler.handleError(
      ErrorFactory.validation('This is a test validation error'),
      { metadata: { testType: 'basic' } }
    );
  };

  const testApiError = async () => {
    await apiErrorHandler.executeApiCall(async () => {
      // Simulate API call that fails
      throw ErrorFactory.database(new Error('Database connection failed'));
    }, { metadata: { testType: 'api' } });
  };

  const testRetryableError = async () => {
    await apiErrorHandler.executeApiCall(async () => {
      // Simulate network error (retryable)
      throw new Error('Network timeout');
    }, { metadata: { testType: 'network' } });
  };

  const testFormError = () => {
    formErrorHandler.handleFormError(
      ErrorFactory.validation('Username is required'),
      'username'
    );
  };

  const testCriticalError = () => {
    basicErrorHandler.handleError(
      ErrorFactory.internal('Critical system error', new Error('System failure')),
      { metadata: { testType: 'critical' } }
    );
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-center">Error Handler Demo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Error Handler */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Error Handler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button onClick={testBasicError} className="w-full">
                Test Validation Error
              </Button>
              
              <Button onClick={testCriticalError} variant="destructive" className="w-full">
                Test Critical Error
              </Button>
            </div>
            
            {basicErrorHandler.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {basicErrorHandler.error.userMessage}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Code: {basicErrorHandler.error.code}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={basicErrorHandler.clearError}
                  className="mt-2"
                >
                  Clear Error
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Error Handler */}
        <Card>
          <CardHeader>
            <CardTitle>API Error Handler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button 
                onClick={testApiError} 
                disabled={apiErrorHandler.isLoading}
                className="w-full"
              >
                {apiErrorHandler.isLoading ? 'Loading...' : 'Test Database Error'}
              </Button>
              
              <Button 
                onClick={testRetryableError} 
                disabled={apiErrorHandler.isLoading}
                variant="secondary" 
                className="w-full"
              >
                {apiErrorHandler.isLoading ? 'Retrying...' : 'Test Retryable Error'}
              </Button>
            </div>
            
            {apiErrorHandler.retryCount > 0 && (
              <p className="text-sm text-blue-600">
                Retry attempts: {apiErrorHandler.retryCount}
              </p>
            )}
            
            {apiErrorHandler.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {apiErrorHandler.error.userMessage}
                </p>
                <div className="flex gap-2 mt-2">
                  {apiErrorHandler.retry && (
                    <Button 
                      size="sm" 
                      onClick={apiErrorHandler.retry}
                      disabled={apiErrorHandler.isLoading}
                    >
                      Retry
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={apiErrorHandler.clearError}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Error Handler */}
        <Card>
          <CardHeader>
            <CardTitle>Form Error Handler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testFormError} className="w-full">
              Test Form Validation Error
            </Button>
            
            {Object.keys(formErrorHandler.fieldErrors).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Field Errors:</h4>
                {Object.entries(formErrorHandler.fieldErrors).map(([field, error]) => (
                  <div key={field} className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">
                      <strong>{field}:</strong> {error}
                    </p>
                  </div>
                ))}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={formErrorHandler.clearAllFieldErrors}
                >
                  Clear All Field Errors
                </Button>
              </div>
            )}

            {formErrorHandler.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  <strong>General Error:</strong> {formErrorHandler.error.userMessage}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={formErrorHandler.clearError}
                  className="mt-2"
                >
                  Clear Error
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Types Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Error Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p><strong>Validation:</strong> User input errors</p>
              <p><strong>Database:</strong> Database operation failures</p>
              <p><strong>Network:</strong> Connection issues (retryable)</p>
              <p><strong>Auth:</strong> Authentication/authorization errors</p>
              <p><strong>Rate Limit:</strong> Too many requests</p>
              <p><strong>Critical:</strong> System-level failures</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Error Information */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handler Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">✅ Automatic Logging</h4>
              <p className="text-gray-600">All errors are automatically logged with context</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🔄 Smart Retry</h4>
              <p className="text-gray-600">Automatic retry for network and temporary errors</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🍞 Toast Notifications</h4>
              <p className="text-gray-600">User-friendly error messages displayed in toasts</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">📊 Error Analytics</h4>
              <p className="text-gray-600">Critical errors sent to monitoring systems</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🛡️ Type Safety</h4>
              <p className="text-gray-600">Fully typed error handling with proper categorization</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🎯 Context Aware</h4>
              <p className="text-gray-600">Errors include component, feature, and user context</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}