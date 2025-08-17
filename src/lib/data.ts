import { Exam, Question } from './types';
import { examService } from './api/examService';

// Use exam service to load data from exam.json
export async function getAvailableExams(): Promise<Exam[]> {
  try {
    const examResponse = await examService.getAllExams();
    return Object.values(examResponse.exams);
  } catch (error) {
    console.error('Failed to load exams:', error);
    return [];
  }
}

export async function getExamById(examId: string): Promise<Exam | null> {
  try {
    return await examService.getExamById(examId);
  } catch (error) {
    console.error(`Failed to load exam ${examId}:`, error);
    return null;
  }
}

export async function getExamQuestions(examId: string): Promise<Question[]> {
  try {
    const exam = await examService.getExamById(examId);
    return exam?.questions || [];
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