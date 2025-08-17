/**
 * API Routes for Exam Management
 * 
 * Provides RESTful endpoints for:
 * - GET /api/exams - List all active exams
 * - POST /api/exams - Create new exam (admin)
 * - PUT /api/exams - Update exam (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { CreateExamRequest, UpdateExamRequest } from '@/lib/types';
import { supabase } from '@/lib/supabase';

// GET /api/exams - List all active exams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const response = await supabaseExamService.getExams();
    
    // Filter out inactive exams unless explicitly requested
    const filteredExams = includeInactive 
      ? response.exams 
      : response.exams.filter(exam => exam.total_questions > 0);

    return NextResponse.json({
      success: true,
      data: filteredExams,
      count: filteredExams.length
    });

  } catch (error: any) {
    console.error('GET /api/exams error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch exams',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/exams - Create new exam (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const examData: CreateExamRequest = await request.json();
    
    if (!examData.id || !examData.title || !examData.topics || !examData.questions) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid exam data', 
          details: 'Missing required fields: id, title, topics, questions' 
        },
        { status: 400 }
      );
    }

    // Validate exam ID uniqueness
    try {
      const existingExam = await supabaseExamService.getExamById(examData.id);
      if (existingExam) {
        return NextResponse.json(
          { success: false, error: 'Exam ID already exists' },
          { status: 409 }
        );
      }
    } catch (error) {
      // Exam doesn't exist, which is what we want
    }

    // Create the exam
    const createdExam = await supabaseExamService.createExam(examData);

    return NextResponse.json({
      success: true,
      data: createdExam,
      message: 'Exam created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/exams error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create exam',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT /api/exams - Update existing exam (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Parse request body
    const { examId, ...updateData }: { examId: string } & UpdateExamRequest = await request.json();
    
    if (!examId) {
      return NextResponse.json(
        { success: false, error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    // Verify exam exists
    try {
      await supabaseExamService.getExamById(examId);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Update the exam
    const updatedExam = await supabaseExamService.updateExam(examId, updateData);

    return NextResponse.json({
      success: true,
      data: updatedExam,
      message: 'Exam updated successfully'
    });

  } catch (error: any) {
    console.error('PUT /api/exams error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update exam',
        details: error.message
      },
      { status: 500 }
    );
  }
}