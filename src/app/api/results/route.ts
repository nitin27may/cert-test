/**
 * API Routes for Exam Results Management
 * 
 * Provides RESTful endpoints for:
 * - GET /api/results - Get user's exam results
 * - POST /api/results - Complete session and generate results
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';

// GET /api/results - Get user results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const examId = searchParams.get('examId');
    const limit = searchParams.get('limit');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const response = await supabaseExamService.getUserResults(userId);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('GET /api/results error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user results' },
      { status: 500 }
    );
  }
}

// POST /api/results - Complete session and generate results
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, userId' },
        { status: 400 }
      );
    }

    const response = await supabaseExamService.completeSession(sessionId);
    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/results error:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}