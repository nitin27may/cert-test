/**
 * Unified Session Management API
 * 
 * Handles all session-related operations:
 * - GET: Get session details
 * - PUT: Update session (submit answers, update progress, etc.)
 * - DELETE: Delete session
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';

// GET /api/sessions/[sessionId] - Get session details
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

    const response = await supabaseExamService.getSession(sessionId, userId);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('GET /api/sessions/[sessionId] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// PUT /api/sessions/[sessionId] - Unified session updates
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const body = await request.json();
    const { action, data, userId } = body;

    if (!action || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, userId' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'submit_answer':
        return await handleAnswerSubmission(sessionId, data, userId);
      
      case 'update_progress':
        return await handleProgressUpdate(sessionId, data, userId);
      
      case 'flag_question':
        return await handleQuestionFlag(sessionId, data, userId);
      
      case 'pause_session':
        return await handleSessionPause(sessionId, data, userId);
      
      case 'resume_session':
        return await handleSessionResume(sessionId, data, userId);
      
      case 'complete_session':
        return await handleSessionComplete(sessionId, data, userId);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: submit_answer, update_progress, flag_question, pause_session, resume_session, complete_session' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('PUT /api/sessions/[sessionId] error:', error);
    return NextResponse.json(
      { error: 'Session update failed' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[sessionId] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    await supabaseExamService.deleteSession(sessionId);
    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error: unknown) {
    console.error('DELETE /api/sessions/[sessionId] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

// Handler functions for different actions
async function handleAnswerSubmission(sessionId: string, data: any, userId: string) {
  const { questionId, userAnswer, timeSpent, isFlagged } = data;

  if (!questionId || !userAnswer) {
    return NextResponse.json(
      { error: 'Missing required fields: questionId, userAnswer' },
      { status: 400 }
    );
  }

  const answerData = {
    question_id: questionId,
    user_answer: userAnswer,
    time_spent_seconds: timeSpent || 0,
    is_flagged: isFlagged || false
  };

  const response = await supabaseExamService.submitAnswer(sessionId, answerData);
  return NextResponse.json(response);
}

async function handleProgressUpdate(sessionId: string, data: any, userId: string) {
  const { currentQuestionIndex, timeSpent, lastActivity } = data;

  const updates = {
    current_question_index: currentQuestionIndex,
    time_spent_seconds: timeSpent,
    last_activity: lastActivity || new Date().toISOString()
  };

  const response = await supabaseExamService.updateSession(sessionId, userId, updates);
  return NextResponse.json(response);
}

async function handleQuestionFlag(sessionId: string, data: any, userId: string) {
  const { questionId, flagged } = data;

  if (typeof flagged !== 'boolean') {
    return NextResponse.json(
      { error: 'Missing or invalid flagged field' },
      { status: 400 }
    );
  }

  // Get existing answer to preserve user_answer
  const existingAnswers = await supabaseExamService.getSessionAnswers(sessionId);
  const existingAnswer = existingAnswers.find(a => a.question_id === questionId);

  const answerData = {
    question_id: questionId,
    user_answer: existingAnswer?.user_answer || [],
    is_flagged: flagged
  };

  const response = await supabaseExamService.submitAnswer(sessionId, answerData);
  return NextResponse.json(response);
}

async function handleSessionPause(sessionId: string, data: any, userId: string) {
  const updates = {
    status: 'paused',
    last_activity: new Date().toISOString()
  };

  const response = await supabaseExamService.updateSession(sessionId, userId, updates);
  return NextResponse.json(response);
}

async function handleSessionResume(sessionId: string, data: any, userId: string) {
  const updates = {
    status: 'in_progress',
    last_activity: new Date().toISOString()
  };

  const response = await supabaseExamService.updateSession(sessionId, userId, updates);
  return NextResponse.json(response);
}

async function handleSessionComplete(sessionId: string, data: any, userId: string) {
  const { score, timeSpent } = data;

  const updates = {
    status: 'completed',
    end_time: new Date().toISOString(),
    score: score || 0,
    time_spent_seconds: timeSpent || 0
  };

  const response = await supabaseExamService.updateSession(sessionId, userId, updates);
  return NextResponse.json(response);
}
