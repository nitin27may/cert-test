/**
 * API Route for Detailed Exam Results
 * 
 * GET /api/results/[sessionId] - Get detailed exam results with questions and answers
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    // Get detailed session information including questions and answers
    const sessionDetails = await supabaseExamService.getSessionDetails(sessionId, userId);
    
    if (!sessionDetails) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(sessionDetails);
  } catch (error: unknown) {
    console.error('GET /api/results/[sessionId] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session details' },
      { status: 500 }
    );
  }
}
