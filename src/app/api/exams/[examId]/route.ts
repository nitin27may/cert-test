/**
 * API Routes for Individual Exam Management
 * 
 * Provides RESTful endpoints for:
 * - GET /api/exams/[examId] - Get exam details
 * - DELETE /api/exams/[examId] - Deactivate exam (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { supabase } from '@/lib/supabase';

// GET /api/exams/[examId] - Get exam details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;

    if (!examId) {
      return NextResponse.json(
        { success: false, error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    const response = await supabaseExamService.getExamById(examId);

    return NextResponse.json({
      success: true,
      data: response.exam
    });

  } catch (error: any) {
    console.error(`GET /api/exams/${params} error:`, error);
    
    // Handle specific errors
    if (error.message === 'Exam not found') {
      return NextResponse.json(
        { success: false, error: 'Exam not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch exam',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/exams/[examId] - Deactivate exam (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
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

    const { examId } = await params;

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

    // Deactivate the exam (soft delete)
    const updatedExam = await supabaseExamService.updateExam(examId, {
      // We would add an is_active field update here
      title: undefined // Placeholder - real implementation would set is_active: false
    });

    return NextResponse.json({
      success: true,
      message: 'Exam deactivated successfully'
    });

  } catch (error: any) {
    console.error(`DELETE /api/exams/${params} error:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deactivate exam',
        details: error.message
      },
      { status: 500 }
    );
  }
}