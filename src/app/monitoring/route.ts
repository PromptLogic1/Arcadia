import { NextRequest, NextResponse } from 'next/server';

const SENTRY_HOST = 'o4509444949934080.ingest.de.sentry.io';
const SENTRY_PROJECT_IDS = ['4509444951244880'];

/**
 * Sentry tunnel endpoint to bypass ad blockers
 * This is configured in next.config.ts as tunnelRoute: '/monitoring'
 */
export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    
    if (!envelope || envelope.trim() === '') {
      return NextResponse.json(
        { error: 'Empty envelope' },
        { status: 400 }
      );
    }
    
    const pieces = envelope.split('\n');
    
    if (!pieces.length || !pieces[0]) {
      return NextResponse.json(
        { error: 'Invalid envelope format' },
        { status: 400 }
      );
    }
    
    // Parse the envelope header safely
    const firstPiece = pieces[0];
    let header;
    try {
      header = JSON.parse(firstPiece);
    } catch (parseError) {
      console.error('Failed to parse envelope header:', parseError);
      return NextResponse.json(
        { error: 'Invalid envelope header' },
        { status: 400 }
      );
    }
    
    if (!header.dsn) {
      return NextResponse.json(
        { error: 'Missing DSN in envelope' },
        { status: 400 }
      );
    }
    
    const dsn = new URL(header.dsn);
    const projectId = dsn.pathname.split('/').pop();

    // Validate project ID
    if (!projectId || !SENTRY_PROJECT_IDS.includes(projectId)) {
      console.error('Invalid Sentry project ID:', projectId);
      return NextResponse.json(
        { error: 'Invalid project' },
        { status: 401 }
      );
    }

    // Construct the upstream URL for German region
    const upstreamUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;

    // Forward the request to Sentry
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      body: envelope,
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
    });

    // Return Sentry's response
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    console.error('Sentry tunnel error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}