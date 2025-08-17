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
          // Fetch questions for this exam
          const parsedQuestions = await this.getExamQuestions(exam.id);
          
          // Convert ParsedQuestion to legacy Question format
          const questions = parsedQuestions.map(q => ({
            id: q.id,
            topic: q.topic_id || '',
            module: q.module || '',
            category: q.category || '',
            type: q.type === 'case-study' ? 'multiple' : q.type,
            difficulty: q.difficulty,
            question: q.question_text,
            options: q.options,
            correct: q.correct_answers,
            explanation: q.explanation || '',
            reasoning: q.reasoning || {
              correct: '',
              why_others_wrong: {}
            },
            reference: q.reference || {
              title: '',
              url: ''
            }
          }));
          
          // Convert ParsedCertificationInfo to legacy CertificationInfo format
          const certificationInfo = fullExam.certification_info ? {
            title: fullExam.certification_info.title,
            description: fullExam.certification_info.description || '',
            examCode: fullExam.certification_info.exam_code || '',
            level: fullExam.certification_info.level || '',
            validity: fullExam.certification_info.validity || '',
            prerequisites: fullExam.certification_info.prerequisites,
            skillsMeasured: fullExam.certification_info.skills_measured,
            studyResources: fullExam.certification_info.study_resources,
            examDetails: fullExam.certification_info.exam_details,
            careerPath: fullExam.certification_info.career_path
          } : undefined;
          
          // Convert ParsedExam to legacy Exam format
          examRecord[exam.id] = {
            id: fullExam.id,
            title: fullExam.title,
            description: fullExam.description || '',
            totalQuestions: fullExam.total_questions,
            networkingFocusPercentage: fullExam.networking_focus_percentage ?? undefined,
            topics: fullExam.topics.map(topic => ({
              id: topic.id,
              name: topic.name,
              modules: topic.modules.map(module => module.module_name)
            })),
            questions: questions,
            certificationInfo: certificationInfo
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
        topicIds: selectedTopics,
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
        networkingFocusPercentage: exam.networking_focus_percentage ?? undefined
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
