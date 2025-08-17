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

// GET /api/answers - Get session answers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId and userId' },
        { status: 400 }
      );
    }

    const response = await supabaseExamService.getSessionAnswers(sessionId);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('GET /api/answers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session answers' },
      { status: 500 }
    );
  }
}

// POST /api/answers - Submit answer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, questionId, selectedAnswers, timeSpent } = body;

    if (!sessionId || !questionId || !selectedAnswers) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, questionId, selectedAnswers' },
        { status: 400 }
      );
    }

    const answerData = {
      question_id: questionId,
      user_answer: selectedAnswers,
      time_spent_seconds: timeSpent || 0
    };

    const response = await supabaseExamService.submitAnswer(sessionId, answerData);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('POST /api/answers error:', error);
    
    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json(
        { error: 'Answer already exists for this question' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}

// PUT /api/answers - Update answer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, questionId, selectedAnswers, timeSpent } = body;

    if (!sessionId || !questionId || !selectedAnswers) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, questionId, selectedAnswers' },
        { status: 400 }
      );
    }

    const answerData = {
      question_id: questionId,
      user_answer: selectedAnswers,
      time_spent_seconds: timeSpent || 0
    };

    const response = await supabaseExamService.submitAnswer(sessionId, answerData);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('PUT /api/answers error:', error);
    
    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json(
        { error: 'Answer already exists for this question' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update answer' },
      { status: 500 }
    );
  }
}