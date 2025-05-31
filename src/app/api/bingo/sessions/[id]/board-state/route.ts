import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { board_state, version } = await request.json();
    
    // Optimistic locking check
    const { data: currentSession } = await supabase
      .from('bingo_sessions')
      .select('version, current_state')
      .eq('id', params.id)
      .single();
    
    if (currentSession?.version !== version) {
      return NextResponse.json(
        { error: 'Session state conflict', current_version: currentSession?.version },
        { status: 409 }
      );
    }
    
    // Update session with new board state
    const { data, error } = await supabase
      .from('bingo_sessions')
      .update({
        current_state: board_state,
        version: version + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('bingo_sessions')
      .select('current_state, version')
      .eq('id', params.id)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}