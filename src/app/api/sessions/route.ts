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
import { CreateSessionRequest, UpdateSessionRequest } from '@/lib/types';
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

// GET /api/sessions - Get user's exam sessions
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
    const status = searchParams.get('status');
    const examId = searchParams.get('examId');

    const response = await supabaseExamService.getUserSessions(user.id);
    
    let filteredSessions = response.sessions;

    // Filter by status if provided
    if (status) {
      filteredSessions = filteredSessions.filter(session => session.status === status);
    }

    // Filter by exam ID if provided
    if (examId) {
      filteredSessions = filteredSessions.filter(session => session.exam_id === examId);
    }

    return NextResponse.json({
      success: true,
      data: filteredSessions,
      count: filteredSessions.length
    });

  } catch (error: any) {
    console.error('GET /api/sessions error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sessions',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create new exam session
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

    // Parse and validate request body
    const sessionData: CreateSessionRequest = await request.json();
    
    if (!sessionData.exam_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid session data', 
          details: 'Missing required field: exam_id' 
        },
        { status: 400 }
      );
    }

    // Verify exam exists
    try {
      await supabaseExamService.getExamById(sessionData.exam_id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Create the session
    const response = await supabaseExamService.createSession(user.id, sessionData);

    return NextResponse.json({
      success: true,
      data: response.session,
      message: 'Session created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/sessions error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create session',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT /api/sessions - Update exam session
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
    const { sessionId, ...updateData }: { sessionId: string } & UpdateSessionRequest = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to user
    try {
      await supabaseExamService.getSession(sessionId, user.id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Update the session
    await supabaseExamService.updateSession(sessionId, user.id, updateData);

    return NextResponse.json({
      success: true,
      message: 'Session updated successfully'
    });

  } catch (error: any) {
    console.error('PUT /api/sessions error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update session',
        details: error.message
      },
      { status: 500 }
    );
  }
}