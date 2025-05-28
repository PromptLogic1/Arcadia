import { TestAuthFlow } from '@/features/auth/testing/test-auth-flow';
import { ApiTest } from '@/features/auth/testing/api-test';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auth System Testing | Arcadia',
  description: 'Test authentication flows, protected routes, and realtime functionality.',
};

export default function AuthTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
            System Testing Dashboard
          </h1>
          <p className="text-gray-400 text-lg">
            Comprehensive testing of authentication, protected routes, realtime functionality, and API endpoints
          </p>
        </div>
        
        <div className="grid gap-8">
          <TestAuthFlow />
          <ApiTest />
        </div>
      </div>
    </div>
  );
} 