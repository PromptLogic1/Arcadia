'use client';

import { useState, useEffect } from 'react';
import {
  RouteErrorBoundary,
  RealtimeErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';
import { Button } from '@/components/ui/Button';

function ThrowError({ type }: { type: string }) {
  // Force re-render to ensure error is thrown during React's render cycle
  const [shouldThrow, setShouldThrow] = useState(false);

  // Use useEffect to trigger error after component mounts
  useEffect(() => {
    if (type) {
      setShouldThrow(true);
    }
  }, [type]);

  if (shouldThrow && type === 'render') {
    // Force a synchronous render error
    throw new Error('Test render error');
  }

  if (shouldThrow && type === 'async') {
    // This doesn't actually work for testing - async errors need different handling
    setTimeout(() => {
      throw new Error('Test async error');
    }, 100);
  }

  if (shouldThrow && type === 'network') {
    throw new Error('WebSocket connection failed');
  }

  return <div>Component rendered successfully</div>;
}

function AsyncComponent() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Async component error');
  }

  return (
    <div className="rounded border border-gray-700 p-4">
      <h3 className="mb-2 text-lg font-semibold">Async Component</h3>
      <Button onClick={() => setShouldError(true)} variant="danger">
        Trigger Async Error
      </Button>
    </div>
  );
}

function RealtimeComponent() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('WebSocket connection lost');
  }

  return (
    <div className="rounded border border-gray-700 p-4">
      <h3 className="mb-2 text-lg font-semibold">Realtime Component</h3>
      <Button onClick={() => setShouldError(true)} variant="danger">
        Trigger Network Error
      </Button>
    </div>
  );
}

export default function TestErrorBoundariesPage() {
  const [errorType, setErrorType] = useState<string | null>(null);

  return (
    <RouteErrorBoundary routeName="TestErrorBoundaries">
      <div className="container mx-auto max-w-4xl p-8">
        <h1 className="mb-8 text-3xl font-bold">Error Boundary Test Page</h1>

        <div className="space-y-8">
          {/* Route-level errors */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Route-Level Errors</h2>
            <p className="text-gray-400">
              These errors will be caught by the RouteErrorBoundary
            </p>

            <div className="flex gap-4">
              <Button onClick={() => setErrorType('render')} variant="danger">
                Throw Render Error
              </Button>
              <Button onClick={() => setErrorType(null)} variant="secondary">
                Reset
              </Button>
            </div>

            {errorType && <ThrowError type={errorType} />}
          </section>

          {/* Async errors */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Async Component Errors</h2>
            <p className="text-gray-400">
              These errors will be caught by the AsyncBoundary
            </p>

            <AsyncBoundary loadingMessage="Loading async component...">
              <AsyncComponent />
            </AsyncBoundary>
          </section>

          {/* Realtime errors */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              Realtime Component Errors
            </h2>
            <p className="text-gray-400">
              These errors will be caught by the RealtimeErrorBoundary
            </p>

            <RealtimeErrorBoundary componentName="TestRealtimeComponent">
              <RealtimeComponent />
            </RealtimeErrorBoundary>
          </section>

          {/* Instructions */}
          <section className="mt-12 rounded-lg bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-semibold">Testing Instructions</h2>
            <ol className="list-inside list-decimal space-y-2 text-gray-300">
              <li>Click each button to trigger different types of errors</li>
              <li>Observe how each error boundary handles the error</li>
              <li>
                Use the &quot;Try Again&quot; or &quot;Reset&quot; buttons to
                recover
              </li>
              <li>Check the console for logged error details</li>
              <li>In production, error details won&apos;t be shown to users</li>
            </ol>
          </section>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
