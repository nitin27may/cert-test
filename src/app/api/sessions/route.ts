/**
 * API Routes for Session Management
 * 
 * Provides RESTful endpoints for:
 * - GET /api/sessions - Get user sessions
 * - POST /api/sessions - Create new session
 * - PUT /api/sessions - Update session
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';


// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (userLimit.count >= 5) { // Max 5 sessions per minute
    return false;
  }
  
  userLimit.count++;
  return true;
}

// GET /api/sessions - Get user sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

// POST /api/sessions - Create new session with enhanced validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, examId, selectedTopics, questionLimit, sessionName } = body;

    // Enhanced validation
    if (!userId || !examId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, examId' },
        { status: 400 }
      );
    }

    if (!selectedTopics || !Array.isArray(selectedTopics) || selectedTopics.length === 0) {
      return NextResponse.json(
        { error: 'At least one topic must be selected' },
        { status: 400 }
      );
    }

    if (questionLimit && (questionLimit < 1 || questionLimit > 100)) {
      return NextResponse.json(
        { error: 'Question limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Too many session creation attempts. Please wait before creating another session.' },
        { status: 429 }
      );
    }

    // Check for existing active sessions
    const existingSessions = await supabaseExamService.getUserActiveSessions(userId);
    if (existingSessions.length >= 3) {
      return NextResponse.json(
        { error: 'Too many active sessions. Please complete or delete existing sessions first.' },
        { status: 429 }
      );
    }

    const sessionData = {
      exam_id: examId,
      session_name: sessionName || `Practice Session - ${new Date().toLocaleDateString()}`,
      selected_topics: selectedTopics,
      question_limit: questionLimit || 20
    };

    const response = await supabaseExamService.createSession(userId, sessionData);

    // Audit logging
    console.log(`Session created: ${response.session.id} for user ${userId} on exam ${examId}`);

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/sessions error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json(
        { error: 'Session already exists for this exam and user' },
        { status: 409 }
      );
    }
    
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
    const { sessionId, userId, updates } = body;

    if (!sessionId || !userId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, userId, updates' },
        { status: 400 }
      );
    }

    const response = await supabaseExamService.updateSession(sessionId, userId, updates);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('PUT /api/sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}