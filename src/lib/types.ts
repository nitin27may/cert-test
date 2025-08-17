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
  difficulty: 'easy' | 'medium' | 'difficult';
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
  weightage?: number;
}

export interface CertificationInfo {
  title: string;
  description: string;
  examCode: string;
  level: string;
  validity: string;
  prerequisites: string[];
  skillsMeasured: Array<{
    category: string;
    weightage: number;
    skills: string[];
  }>;
  studyResources: Array<{
    title: string;
    type: string;
    url: string;
    description: string;
  }>;
  examDetails: {
    duration: string;
    questions: string;
    passingScore: string;
    cost: string;
    languages: string[];
  };
  careerPath: string[];
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  networkingFocusPercentage?: number;
  topics: ExamTopic[];
  questions: Question[];
  certificationInfo?: CertificationInfo;
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
