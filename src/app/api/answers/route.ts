/**
 * API Routes for Answer Management
 * 
 * Provides RESTful endpoints for:
 * - GET /api/answers - Get session answers
 * - POST /api/answers - Submit answer
 * - PUT /api/answers - Update answer (flag, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { SubmitAnswerRequest } from '@/lib/types';
import { supabase } from '@/lib/supabase';

// Helper function to verify authentication
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization required', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { error: 'Invalid authentication', status: 401 };
  }

  return { user };
}

// GET /api/answers - Get session answers
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    try {
      await supabaseExamService.getSession(sessionId, user.id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    const answers = await supabaseExamService.getSessionAnswers(sessionId);

    return NextResponse.json({
      success: true,
      data: answers,
      count: answers.length
    });

  } catch (error: any) {
    console.error('GET /api/answers error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch answers',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/answers - Submit answer
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // Parse request body
    const { sessionId, ...answerData }: { sessionId: string } & SubmitAnswerRequest = await request.json();
    
    if (!sessionId || !answerData.question_id || !answerData.user_answer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid answer data', 
          details: 'Missing required fields: sessionId, question_id, user_answer' 
        },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    try {
      await supabaseExamService.getSession(sessionId, user.id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Submit the answer
    const submittedAnswer = await supabaseExamService.submitAnswer(sessionId, answerData);

    return NextResponse.json({
      success: true,
      data: submittedAnswer,
      message: 'Answer submitted successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/answers error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit answer',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT /api/answers - Update answer (flag, modify response)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // Parse request body
    const { sessionId, ...answerData }: { sessionId: string } & SubmitAnswerRequest = await request.json();
    
    if (!sessionId || !answerData.question_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid answer data', 
          details: 'Missing required fields: sessionId, question_id' 
        },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    try {
      await supabaseExamService.getSession(sessionId, user.id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Update the answer
    const updatedAnswer = await supabaseExamService.submitAnswer(sessionId, answerData);

    return NextResponse.json({
      success: true,
      data: updatedAnswer,
      message: 'Answer updated successfully'
    });

  } catch (error: any) {
    console.error('PUT /api/answers error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update answer',
        details: error.message
      },
      { status: 500 }
    );
  }
}