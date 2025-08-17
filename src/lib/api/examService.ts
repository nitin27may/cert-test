import { Exam, Question, ParsedExam, ParsedQuestion, ExamListResponse, ExamDetailResponse, ExamQuestionsResponse } from '../types';
import { supabaseExamService } from '../services/supabaseService';

export interface ExamResponse {
  exams: Record<string, Exam>;
}

class ExamService {
  private cache: Map<string, ParsedExam> = new Map();
  private allExamsCache: ExamResponse | null = null;

  async getAllExams(): Promise<ExamResponse> {
    if (this.allExamsCache) {
      return this.allExamsCache;
    }

    try {
      // Use Supabase API instead of JSON file
      const response: ExamListResponse = await supabaseExamService.getExams();
      
      // Convert to legacy format for compatibility
      const examRecord: Record<string, Exam> = {};
      for (const exam of response.exams) {
        // Get full exam details including topics and questions
        const fullExam = await this.getExamById(exam.id);
        if (fullExam) {
          // Convert ParsedExam to legacy Exam format
          examRecord[exam.id] = {
            id: fullExam.id,
            title: fullExam.title,
            description: fullExam.description,
            totalQuestions: fullExam.totalQuestions,
            networkingFocusPercentage: fullExam.networkingFocusPercentage,
            certification_guide_url: fullExam.certification_guide_url,
            study_guide_url: fullExam.study_guide_url,
            topics: fullExam.topics,
            questions: fullExam.questions,
            certificationInfo: fullExam.certificationInfo
          };
        }
      }
      
      const data: ExamResponse = { exams: examRecord };
      this.allExamsCache = data;
      
      return data;
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      throw new Error('Failed to load exam data. Please try again later.');
    }
  }

  async getExamById(examId: string): Promise<ParsedExam | null> {
    // Check cache first
    if (this.cache.has(examId)) {
      return this.cache.get(examId)!;
    }

    try {
      // Use Supabase API
      const response: ExamDetailResponse = await supabaseExamService.getExamById(examId);
      const exam = response.exam;
      
      // Cache the result
      this.cache.set(examId, exam);
      
      return exam;
    } catch (error) {
      console.error(`Failed to fetch exam ${examId}:`, error);
      return null;
    }
  }

  async getExamQuestions(examId: string, count?: number, selectedTopics?: string[]): Promise<ParsedQuestion[]> {
    try {
      // Use Supabase API directly for better performance
      const response: ExamQuestionsResponse = await supabaseExamService.getExamQuestions(examId, {
        limit: count,
        topics: selectedTopics,
        shuffle: true
      });
      
      return response.questions;
    } catch (error) {
      console.error(`Failed to fetch questions for exam ${examId}:`, error);
      return [];
    }
  }

  async getAvailableExams(): Promise<Array<{ id: string; title: string; description: string; totalQuestions: number; networkingFocusPercentage?: number }>> {
    try {
      // Use Supabase API directly
      const response: ExamListResponse = await supabaseExamService.getExams();
      return response.exams.map(exam => ({
        id: exam.id,
        title: exam.title,
        description: exam.description || '',
        totalQuestions: exam.total_questions,
        networkingFocusPercentage: exam.networking_focus_percentage
      }));
    } catch (error) {
      console.error('Failed to fetch available exams:', error);
      return [];
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Clear cache (useful for development or data updates)
  clearCache(): void {
    this.cache.clear();
    this.allExamsCache = null;
  }
}

// Export singleton instance
export const examService = new ExamService();
