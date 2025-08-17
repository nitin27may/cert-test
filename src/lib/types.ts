// TypeScript interfaces for Azure Practice Exams

// Legacy JSON structure types (kept for migration compatibility)
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

// New Database-oriented types

// Enums matching database types
export type ExamDifficulty = 'easy' | 'medium' | 'difficult';
export type QuestionType = 'single' | 'multiple';
export type SessionStatus = 'in_progress' | 'completed' | 'paused' | 'abandoned';

// Database table interfaces
export interface DbExam {
  id: string;
  title: string;
  description: string | null;
  total_questions: number;
  networking_focus_percentage: number | null;
  certification_guide_url: string | null;
  study_guide_url: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface DbTopic {
  id: string;
  exam_id: string;
  name: string;
  weight: string | null;
  weightage: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbTopicModule {
  id: string;
  topic_id: string;
  module_name: string;
  description: string | null;
  created_at: string;
}

export interface DbQuestion {
  id: number;
  exam_id: string;
  topic_id: string | null;
  module: string | null;
  category: string | null;
  type: QuestionType;
  difficulty: ExamDifficulty;
  question_text: string;
  options: string; // JSON string
  correct_answers: string; // JSON string
  explanation: string | null;
  reasoning: string | null; // JSON string
  reference: string | null; // JSON string
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface DbCertificationInfo {
  id: string;
  exam_id: string;
  title: string;
  description: string | null;
  exam_code: string | null;
  level: string | null;
  validity: string | null;
  prerequisites: string | null; // JSON string
  skills_measured: string | null; // JSON string
  study_resources: string | null; // JSON string
  exam_details: string | null; // JSON string
  career_path: string | null; // JSON string
  created_at: string;
  updated_at: string;
}

export interface DbUserExamSession {
  id: string;
  user_id: string;
  exam_id: string;
  session_name: string | null;
  selected_topics: string | null; // JSON string
  question_limit: number | null;
  current_question_index: number;
  status: SessionStatus;
  start_time: string;
  end_time: string | null;
  last_activity: string;
  total_questions: number;
  questions_answered: number;
  correct_answers: number;
  score: number | null;
  time_spent_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface DbSessionQuestion {
  id: string;
  session_id: string;
  question_id: number;
  question_order: number;
  created_at: string;
}

export interface DbUserAnswer {
  id: string;
  session_id: string;
  question_id: number;
  user_answer: string; // JSON string
  is_correct: boolean | null;
  is_flagged: boolean;
  time_spent_seconds: number;
  answered_at: string;
  updated_at: string;
}

export interface DbExamResult {
  id: string;
  session_id: string;
  user_id: string;
  exam_id: string;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  score_percentage: number;
  pass_status: boolean | null;
  time_spent_seconds: number;
  average_time_per_question: number | null;
  topic_scores: string | null; // JSON string
  difficulty_scores: string | null; // JSON string
  completed_at: string;
  created_at: string;
}

export interface DbUserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  default_topics: string | null; // JSON string
  keyboard_navigation: boolean;
  show_detailed_explanations: boolean;
  auto_save_interval_seconds: number;
  created_at: string;
  updated_at: string;
}

// Transformed types for UI consumption (parsed from database)
export interface ParsedQuestion {
  id: number;
  exam_id: string;
  topic_id: string | null;
  module: string | null;
  category: string | null;
  type: QuestionType;
  difficulty: ExamDifficulty;
  question_text: string;
  options: string[];
  correct_answers: number[];
  explanation: string | null;
  reasoning: QuestionReasoning | null;
  reference: QuestionReference | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ParsedTopic {
  id: string;
  exam_id: string;
  name: string;
  weight: string | null;
  weightage: number | null;
  modules: DbTopicModule[];
  created_at: string;
  updated_at: string;
}

export interface ParsedExam {
  id: string;
  title: string;
  description: string | null;
  total_questions: number;
  networking_focus_percentage: number | null;
  certification_guide_url: string | null;
  study_guide_url: string | null;
  topics: ParsedTopic[];
  certification_info: ParsedCertificationInfo | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ParsedCertificationInfo {
  id: string;
  exam_id: string;
  title: string;
  description: string | null;
  exam_code: string | null;
  level: string | null;
  validity: string | null;
  prerequisites: string[];
  skills_measured: Array<{
    category: string;
    weightage: number;
    skills: string[];
  }>;
  study_resources: Array<{
    title: string;
    type: string;
    url: string;
    description: string;
  }>;
  exam_details: {
    duration: string;
    questions: string;
    passingScore: string;
    cost: string;
    languages: string[];
  };
  career_path: string[];
  created_at: string;
  updated_at: string;
}

export interface ParsedUserExamSession {
  id: string;
  user_id: string;
  exam_id: string;
  session_name: string | null;
  selected_topics: string[];
  question_limit: number | null;
  current_question_index: number;
  status: SessionStatus;
  start_time: string;
  end_time: string | null;
  last_activity: string;
  total_questions: number;
  questions_answered: number;
  correct_answers: number;
  score: number | null;
  time_spent_seconds: number;
  questions: ParsedQuestion[];
  created_at: string;
  updated_at: string;
}

export interface ParsedUserAnswer {
  id: string;
  session_id: string;
  question_id: number;
  user_answer: number[];
  is_correct: boolean | null;
  is_flagged: boolean;
  time_spent_seconds: number;
  answered_at: string;
  updated_at: string;
}

export interface ParsedExamResult {
  id: string;
  session_id: string;
  user_id: string;
  exam_id: string;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  score_percentage: number;
  pass_status: boolean | null;
  time_spent_seconds: number;
  average_time_per_question: number | null;
  topic_scores: Record<string, { correct: number; total: number; percentage: number }> | null;
  difficulty_scores: Record<ExamDifficulty, { correct: number; total: number; percentage: number }> | null;
  completed_at: string;
  created_at: string;
}

export interface ParsedUserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  default_topics: string[];
  keyboard_navigation: boolean;
  show_detailed_explanations: boolean;
  auto_save_interval_seconds: number;
  created_at: string;
  updated_at: string;
}

// Legacy types maintained for compatibility
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

// API Response types
export interface ExamListResponse {
  exams: Array<{
    id: string;
    title: string;
    description: string | null;
    total_questions: number;
    networking_focus_percentage: number | null;
  }>;
}

export interface ExamDetailResponse {
  exam: ParsedExam;
}

export interface ExamQuestionsResponse {
  questions: ParsedQuestion[];
  total_count: number;
}

export interface UserSessionResponse {
  session: ParsedUserExamSession;
}

export interface UserSessionsResponse {
  sessions: Array<{
    id: string;
    exam_id: string;
    exam_title: string;
    status: SessionStatus;
    progress: number;
    score: number | null;
    last_activity: string;
    total_questions: number;
    questions_answered: number;
  }>;
}

export interface ExamResultResponse {
  result: ParsedExamResult;
}

export interface ExamResultsResponse {
  results: Array<{
    id: string;
    exam_id: string;
    exam_title: string;
    score_percentage: number;
    pass_status: boolean | null;
    completed_at: string;
    time_spent_seconds: number;
  }>;
}

// Form types for creating/updating data
export interface CreateExamRequest {
  id: string;
  title: string;
  description?: string;
  certification_guide_url?: string;
  study_guide_url?: string;
  topics: Array<{
    id: string;
    name: string;
    weight?: string;
    modules: string[];
  }>;
  questions: Array<Omit<ParsedQuestion, 'created_at' | 'updated_at' | 'exam_id'>>;
  certification_info?: Omit<ParsedCertificationInfo, 'id' | 'exam_id' | 'created_at' | 'updated_at'>;
}

export interface UpdateExamRequest extends Partial<CreateExamRequest> {
  questions_to_add?: Array<Omit<ParsedQuestion, 'created_at' | 'updated_at' | 'exam_id'>>;
  questions_to_update?: Array<Partial<ParsedQuestion> & { id: number }>;
  questions_to_remove?: number[];
}

export interface CreateSessionRequest {
  exam_id: string;
  session_name?: string;
  selected_topics?: string[];
  question_limit?: number;
}

export interface UpdateSessionRequest {
  current_question_index?: number;
  last_activity?: string;
  time_spent_seconds?: number;
}

export interface SubmitAnswerRequest {
  question_id: number;
  user_answer: number[];
  time_spent_seconds?: number;
  is_flagged?: boolean;
}

// Event types for real-time updates
export interface SessionUpdateEvent {
  type: 'session_update';
  session_id: string;
  data: Partial<ParsedUserExamSession>;
}

export interface AnswerUpdateEvent {
  type: 'answer_update';
  session_id: string;
  question_id: number;
  data: ParsedUserAnswer;
}

export interface SessionCompleteEvent {
  type: 'session_complete';
  session_id: string;
  result: ParsedExamResult;
}
