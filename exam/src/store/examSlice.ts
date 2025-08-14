import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Exam, ExamSession, Question, ExamState } from '@/lib/types';
import { getAvailableExams, getExamById, filterQuestionsByTopics } from '@/lib/data';
import { shuffleArray, validateAnswer, storage, getStorageKeys } from '@/lib/utils';

// Async thunks
export const loadExam = createAsyncThunk(
  'exam/loadExam',
  async (examId: string) => {
    const exam = await getExamById(examId);
    if (!exam) {
      throw new Error(`Exam with ID ${examId} not found`);
    }
    return exam;
  }
);

export const startExamSession = createAsyncThunk(
  'exam/startExamSession',
  async ({
    examId,
    selectedTopics,
    questionLimit,
  }: {
    examId: string;
    selectedTopics: string[];
    questionLimit?: number;
  }) => {
    const exam = await getExamById(examId);
    if (!exam) {
      throw new Error(`Exam with ID ${examId} not found`);
    }

    // Filter questions by selected topics
    let questions = filterQuestionsByTopics(exam.questions, selectedTopics);
    
    // Shuffle questions
    questions = shuffleArray(questions);
    
    // Limit questions if specified
    if (questionLimit && questionLimit < questions.length) {
      questions = questions.slice(0, questionLimit);
    }

    const session: ExamSession = {
      examId,
      selectedTopics,
      questionLimit,
      currentQuestionIndex: 0,
      userAnswers: {},
      checkedQuestions: [],
      answeredQuestions: [],
      correctAnswers: 0,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      examQuestions: questions,
    };

    // Save to localStorage
    const storageKeys = getStorageKeys(examId);
    storage.set(storageKeys.examSession, session);
    
    // Add to active exams
    const activeExams: Record<string, any> = storage.get(storageKeys.activeExams, {});
    activeExams[examId] = {
      examId,
      title: exam.title,
      progress: 0,
      lastActivity: session.lastActivity,
    };
    storage.set(storageKeys.activeExams, activeExams);

    return { exam, session };
  }
);

export const resumeExamSession = createAsyncThunk(
  'exam/resumeExamSession',
  async (examId: string) => {
    const exam = await getExamById(examId);
    if (!exam) {
      throw new Error(`Exam with ID ${examId} not found`);
    }

    const storageKeys = getStorageKeys(examId);
    const session = storage.get<ExamSession | null>(storageKeys.examSession, null);
    
    if (!session) {
      throw new Error(`No active session found for exam ${examId}`);
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();
    storage.set(storageKeys.examSession, session);

    return { exam, session };
  }
);

// Initial state
const initialState: ExamState = {
  currentExam: null,
  examSession: null,
  isLoading: false,
  error: null,
};

// Exam slice
const examSlice = createSlice({
  name: 'exam',
  initialState,
  reducers: {
    selectAnswer: (state, action: PayloadAction<{ questionId: number; answer: number | number[] }>) => {
      if (!state.examSession) return;
      
      const { questionId, answer } = action.payload;
      state.examSession.userAnswers[questionId] = answer;
      
      // Add to answered questions if not already there
      if (!state.examSession.answeredQuestions.includes(questionId)) {
        state.examSession.answeredQuestions.push(questionId);
      }
      
      // Update last activity
      state.examSession.lastActivity = new Date().toISOString();
      
      // Save to localStorage
      if (state.currentExam) {
        const storageKeys = getStorageKeys(state.currentExam.id);
        storage.set(storageKeys.examSession, state.examSession);
      }
    },

    checkAnswer: (state, action: PayloadAction<number>) => {
      if (!state.examSession || !state.currentExam) return;
      
      const questionId = action.payload;
      const question = state.examSession.examQuestions.find(q => q.id === questionId);
      const userAnswer = state.examSession.userAnswers[questionId];
      
      if (!question || userAnswer === undefined) return;
      
      // Add to checked questions
      if (!state.examSession.checkedQuestions.includes(questionId)) {
        state.examSession.checkedQuestions.push(questionId);
        
        // Check if answer is correct
        const isCorrect = validateAnswer(userAnswer, question.correct, question.type);
        if (isCorrect) {
          state.examSession.correctAnswers++;
        }
      }
      
      // Update last activity
      state.examSession.lastActivity = new Date().toISOString();
      
      // Save to localStorage
      const storageKeys = getStorageKeys(state.currentExam.id);
      storage.set(storageKeys.examSession, state.examSession);
    },

    navigateToQuestion: (state, action: PayloadAction<number>) => {
      if (!state.examSession) return;
      
      const index = action.payload;
      if (index >= 0 && index < state.examSession.examQuestions.length) {
        state.examSession.currentQuestionIndex = index;
        state.examSession.lastActivity = new Date().toISOString();
        
        // Save to localStorage
        if (state.currentExam) {
          const storageKeys = getStorageKeys(state.currentExam.id);
          storage.set(storageKeys.examSession, state.examSession);
        }
      }
    },

    nextQuestion: (state) => {
      if (!state.examSession) return;
      
      const nextIndex = state.examSession.currentQuestionIndex + 1;
      if (nextIndex < state.examSession.examQuestions.length) {
        state.examSession.currentQuestionIndex = nextIndex;
        state.examSession.lastActivity = new Date().toISOString();
        
        // Save to localStorage
        if (state.currentExam) {
          const storageKeys = getStorageKeys(state.currentExam.id);
          storage.set(storageKeys.examSession, state.examSession);
        }
      }
    },

    previousQuestion: (state) => {
      if (!state.examSession) return;
      
      const prevIndex = state.examSession.currentQuestionIndex - 1;
      if (prevIndex >= 0) {
        state.examSession.currentQuestionIndex = prevIndex;
        state.examSession.lastActivity = new Date().toISOString();
        
        // Save to localStorage
        if (state.currentExam) {
          const storageKeys = getStorageKeys(state.currentExam.id);
          storage.set(storageKeys.examSession, state.examSession);
        }
      }
    },

    resetExamSession: (state) => {
      if (!state.currentExam) return;
      
      // Clear localStorage
      const storageKeys = getStorageKeys(state.currentExam.id);
      storage.remove(storageKeys.examSession);
      
      // Remove from active exams
      const activeExams: Record<string, any> = storage.get(storageKeys.activeExams, {});
      delete activeExams[state.currentExam.id];
      storage.set(storageKeys.activeExams, activeExams);
      
      // Reset state
      state.examSession = null;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load exam
      .addCase(loadExam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentExam = action.payload;
      })
      .addCase(loadExam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load exam';
      })
      
      // Start exam session
      .addCase(startExamSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startExamSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentExam = action.payload.exam;
        state.examSession = action.payload.session;
      })
      .addCase(startExamSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to start exam session';
      })
      
      // Resume exam session
      .addCase(resumeExamSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resumeExamSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentExam = action.payload.exam;
        state.examSession = action.payload.session;
      })
      .addCase(resumeExamSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to resume exam session';
      });
  },
});

export const {
  selectAnswer,
  checkAnswer,
  navigateToQuestion,
  nextQuestion,
  previousQuestion,
  resetExamSession,
  clearError,
} = examSlice.actions;

export default examSlice.reducer;
