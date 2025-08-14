// TypeScript interfaces for Azure Practice Exams

export interface QuestionReference {
  title: string;
  url: string;
}

export interface QuestionReasoning {
  correct: string;
  why_others_wrong: Record<string, string>;
}

export interface Question {
  id: number;
  topic: string;
  module: string;
  category: string;
  type: 'single' | 'multiple';
  question: string;
  options: string[];
  correct: number | number[];
  explanation: string;
  reasoning: QuestionReasoning;
  reference: QuestionReference;
}

export interface ExamTopic {
  id: string;
  name: string;
  modules: string[];
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  networkingFocusPercentage?: number;
  topics: ExamTopic[];
  questions: Question[];
}

export interface ExamData {
  exams: Record<string, Exam>;
}

export interface ExamSession {
  examId: string;
  selectedTopics: string[];
  questionLimit?: number;
  currentQuestionIndex: number;
  userAnswers: Record<number, number | number[]>;
  checkedQuestions: number[];
  answeredQuestions: number[];
  correctAnswers: number;
  startTime: string;
  lastActivity: string;
  examQuestions: Question[];
}

export interface ExamState {
  currentExam: Exam | null;
  examSession: ExamSession | null;
  isLoading: boolean;
  error: string | null;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultTopics: string[];
  keyboardNavigation: boolean;
  showDetailedExplanations: boolean;
}

export interface ExamStats {
  totalAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  timeSpent: number;
  averageTimePerQuestion: number;
}
