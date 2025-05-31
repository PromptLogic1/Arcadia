import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import type { BoardCell } from '@/features/bingo-boards/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { 
      cell_position, 
      user_id, 
      action, // 'mark' | 'unmark'
      version 
    } = await request.json();
    
    // Start transaction-like operation
    const { data: session, error: sessionError } = await supabase
      .from('bingo_sessions')
      .select('current_state, version, status')
      .eq('id', params.id)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session not active' }, { status: 400 });
    }
    
    if (session.version !== version) {
      return NextResponse.json(
        { error: 'Version conflict', current_version: session.version },
        { status: 409 }
      );
    }
    
    // Update board state
    const currentState = (session.current_state as unknown as BoardCell[]) || [];
    const newState = [...currentState];
    
    if (newState[cell_position]) {
      if (action === 'mark') {
        newState[cell_position] = {
          ...newState[cell_position],
          isMarked: true,
          lastModifiedBy: user_id,
          lastUpdated: Date.now()
        };
      } else {
        newState[cell_position] = {
          ...newState[cell_position],
          isMarked: false,
          lastModifiedBy: user_id,
          lastUpdated: Date.now()
        };
      }
    }
    
    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('bingo_sessions')
      .update({
        current_state: newState as unknown as any,
        version: version + 1
      })
      .eq('id', params.id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    
    // Log the event
    await supabase
      .from('bingo_session_events')
      .insert({
        session_id: params.id,
        user_id,
        event_type: action === 'mark' ? 'cell_marked' : 'cell_unmarked',
        event_data: { cell_position, timestamp: Date.now() },
        cell_position,
        timestamp: Date.now()
      });
    
    return NextResponse.json(updatedSession);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}