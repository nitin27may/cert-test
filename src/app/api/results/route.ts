/**
 * API Routes for Exam Results Management
 * 
 * Provides RESTful endpoints for:
 * - GET /api/results - Get user's exam results
 * - POST /api/results - Complete session and generate results
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';
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

// GET /api/results - Get user's exam results
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
    const examId = searchParams.get('examId');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const response = await supabaseExamService.getUserResults(user.id);
    
    let filteredResults = response.results;

    // Filter by exam ID if provided
    if (examId) {
      filteredResults = filteredResults.filter(result => result.exam_id === examId);
    }

    // Apply pagination
    const startIndex = offset ? parseInt(offset) : 0;
    const endIndex = limit ? startIndex + parseInt(limit) : filteredResults.length;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedResults,
      pagination: {
        count: paginatedResults.length,
        total: filteredResults.length,
        offset: startIndex,
        limit: limit ? parseInt(limit) : filteredResults.length
      }
    });

  } catch (error: any) {
    console.error('GET /api/results error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch results',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/results - Complete session and generate results
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
    const { sessionId }: { sessionId: string } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user and is in progress
    try {
      const sessionResponse = await supabaseExamService.getSession(sessionId, user.id);
      const session = sessionResponse.session;
      
      if (session.status === 'completed') {
        return NextResponse.json(
          { success: false, error: 'Session already completed' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Complete the session and generate results
    const response = await supabaseExamService.completeSession(sessionId);

    return NextResponse.json({
      success: true,
      data: response.result,
      message: 'Session completed and results generated successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/results error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete session',
        details: error.message
      },
      { status: 500 }
    );
  }
}