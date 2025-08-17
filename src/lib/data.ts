import { Exam, Question, ParsedExam, ParsedQuestion, ExamListResponse, ExamDetailResponse, ExamQuestionsResponse, ExamDifficulty } from './types';
import { supabaseExamService } from './services/supabaseService';

// Updated to use Supabase APIs instead of JSON file
export async function getAvailableExams(): Promise<ParsedExam[]> {
  try {
    const response: ExamListResponse = await supabaseExamService.getExams();
    // Convert to ParsedExam format for compatibility
    return response.exams.map(exam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      total_questions: exam.total_questions,
      networking_focus_percentage: exam.networking_focus_percentage,
      certification_guide_url: null, // Not available from list API
      study_guide_url: null, // Not available from list API
      topics: [], // Will be loaded separately when needed
      certification_info: null, // Will be loaded separately when needed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true // Default to active since we don't have this field
    }));
  } catch (error) {
    console.error('Failed to load exams:', error);
    return [];
  }
}

export async function getExamById(examId: string): Promise<ParsedExam | null> {
  try {
    const response: ExamDetailResponse = await supabaseExamService.getExamById(examId);
    return response.exam;
  } catch (error) {
    console.error(`Failed to load exam ${examId}:`, error);
    return null;
  }
}

export async function getExamQuestions(
  examId: string, 
  options?: {
    limit?: number;
    topics?: string[];
    difficulty?: ExamDifficulty;
    shuffle?: boolean;
  }
): Promise<ParsedQuestion[]> {
  try {
    const response: ExamQuestionsResponse = await supabaseExamService.getExamQuestions(examId, {
      limit: options?.limit,
      topicIds: options?.topics,
      difficulty: options?.difficulty,
      shuffle: options?.shuffle
    });
    return response.questions;
  } catch (error) {
    console.error(`Failed to load questions for exam ${examId}:`, error);
    return [];
  }
}

export function validateExamData(exam: any): exam is Exam {
  return (
    typeof exam.id === 'string' &&
    typeof exam.title === 'string' &&
    typeof exam.description === 'string' &&
    typeof exam.totalQuestions === 'number' &&
    Array.isArray(exam.topics) &&
    Array.isArray(exam.questions)
  );
}

// Filter questions by topics
export function filterQuestionsByTopics(questions: Question[], selectedTopics: string[]): Question[] {
  if (selectedTopics.length === 0) return questions;
  return questions.filter(question => selectedTopics.includes(question.topic));
}