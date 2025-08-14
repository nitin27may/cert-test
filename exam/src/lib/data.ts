import { Exam, Question } from './types';
import { sampleExams } from './sampleData';

// Mock data for now - replace with actual data loading logic
export async function getAvailableExams(): Promise<Exam[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));
  return sampleExams;
}

export async function getExamById(examId: string): Promise<Exam | null> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));
  return sampleExams.find(exam => exam.id === examId) || null;
}

export async function getExamQuestions(examId: string): Promise<Question[]> {
  const exam = await getExamById(examId);
  return exam?.questions || [];
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