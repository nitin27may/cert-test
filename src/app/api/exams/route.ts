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

// GET /api/exams - List all exams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    const response = await supabaseExamService.getExams();
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('GET /api/exams error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

// POST /api/exams - Create exam (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Add admin authentication check
    // const user = await verifyAdminAuth(request);
    
    const response = await supabaseExamService.createExam(body);
    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/exams error:', error);
    return NextResponse.json(
      { error: 'Failed to create exam' },
      { status: 500 }
    );
  }
}

// PUT /api/exams - Update exam (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Add admin authentication check
    // const user = await verifyAdminAuth(request);
    
    const response = await supabaseExamService.updateExam(body.examId, body.updateData);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('PUT /api/exams error:', error);
    return NextResponse.json(
      { error: 'Failed to update exam' },
      { status: 500 }
    );
  }
}