/**
 * API Routes for Exam Session Management
 * 
 * Provides RESTful endpoints for:
 * - GET /api/sessions - Get user's exam sessions
 * - POST /api/sessions - Create new exam session
 * - PUT /api/sessions - Update exam session
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';

// GET /api/sessions - Get user sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const examId = searchParams.get('examId');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const response = await supabaseExamService.getUserSessions(userId);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('GET /api/sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, examId, selectedTopics, questionLimit, sessionName } = body;

    if (!userId || !examId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, examId' },
        { status: 400 }
      );
    }

    const sessionData = {
      exam_id: examId,
      session_name: sessionName,
      selected_topics: selectedTopics,
      question_limit: questionLimit
    };

    const response = await supabaseExamService.createSession(userId, sessionData);

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// PUT /api/sessions - Update session
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId, updateData } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, userId' },
        { status: 400 }
      );
    }

    const response = await supabaseExamService.updateSession(sessionId, userId, updateData);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('PUT /api/sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}