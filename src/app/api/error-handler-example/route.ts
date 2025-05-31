import type { NextRequest } from 'next/server';
import { 
  toApiResponse, 
  ErrorFactory, 
  withErrorHandling 
} from '@/lib/error-handler';
import { createServerComponentClient } from '@/lib/supabase';

// Example of using error handling in an API route
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testError = searchParams.get('error');

  try {
    // Simulate different types of errors based on query parameter
    if (testError === 'validation') {
      throw ErrorFactory.validation('Invalid test parameter');
    }
    
    if (testError === 'unauthorized') {
      throw ErrorFactory.unauthorized('User not authenticated');
    }
    
    if (testError === 'database') {
      throw ErrorFactory.database(new Error('Connection failed'));
    }
    
    if (testError === 'rate-limit') {
      throw ErrorFactory.rateLimit({ apiRoute: 'error-handler-example' });
    }

    // Simulate a successful operation
    return Response.json({ 
      message: 'Error handler test successful',
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    return toApiResponse(error, {
      apiRoute: 'error-handler-example',
      method: 'GET',
      metadata: { 
        userAgent: request.headers.get('user-agent') || 'unknown',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });
  }
}

// Example of using withErrorHandling wrapper
const protectedHandler = withErrorHandling(async (_request: NextRequest) => {
  const supabase = await createServerComponentClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw ErrorFactory.unauthorized('Authentication required');
  }

  // Simulate some database operation
  const { data, error: dbError } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', user.id)
    .single();

  if (dbError) {
    throw ErrorFactory.database(dbError);
  }

  return Response.json({ user: data });
});

export async function POST(request: NextRequest) {
  return protectedHandler(request);
}