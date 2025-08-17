/**
 * API Routes for Individual Exam Management
 * 
 * Provides RESTful endpoints for:
 * - GET /api/exams/[examId] - Get exam details
 * - DELETE /api/exams/[examId] - Deactivate exam (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseExamService } from '@/lib/services/supabaseService';

// GET /api/exams/[examId] - Get exam details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;

    const response = await supabaseExamService.getExamById(examId);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error(`GET /api/exams/${params} error:`, error);
    return NextResponse.json(
      { error: 'Exam not found' },
      { status: 404 }
    );
  }
}

// DELETE /api/exams/[examId] - Deactivate exam (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    
    // TODO: Add admin authentication check
    // const user = await verifyAdminAuth(request);
    
    // TODO: Implement actual deactivation logic in supabaseExamService
    // For now, just return success message
    console.log(`Exam ${examId} marked for deactivation`);
    
    return NextResponse.json(
      { message: 'Exam deactivation requested successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`DELETE /api/exams/${params} error:`, error);
    return NextResponse.json(
      { error: 'Failed to deactivate exam' },
      { status: 500 }
    );
  }
}