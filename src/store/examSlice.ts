import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Exam, ExamSession, Question, ExamState } from '@/lib/types';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { shuffleArray, validateAnswer } from '@/lib/utils';

// Async thunks
export const loadExam = createAsyncThunk(
  'exam/loadExam',
  async (examId: string) => {
    const response = await supabaseExamService.getExamById(examId);
    if (!response.exam) {
      throw new Error(`Exam with ID ${examId} not found`);
    }
    return response.exam;
  }
);

export const startExamSession = createAsyncThunk(
  'exam/startExamSession',
  async ({
    examId,
    selectedTopics,
    questionLimit,
    userId,
  }: {
    examId: string;
    selectedTopics: string[];
    questionLimit?: number;
    userId: string;
  }) => {
    // Create a new session in the database
    const sessionResponse = await supabaseExamService.createSession(userId, {
      exam_id: examId,
      selected_topics: selectedTopics,
      question_limit: questionLimit || 20,
      session_name: `Practice Session - ${new Date().toLocaleDateString()}`
    });

    return { 
      exam: { id: examId }, // Minimal exam info since we're using the session
      session: sessionResponse.session 
    };
  }
);

export const resumeExamSession = createAsyncThunk(
  'exam/resumeExamSession',
  async ({ examId, userId }: { examId: string; userId: string }) => {
    // Get user sessions and find the one for this exam
    const { sessions } = await supabaseExamService.getUserSessions(userId);
    const session = sessions.find(s => s.exam_id === examId && s.status === 'in_progress');
    
    if (!session) {
      throw new Error(`No active session found for exam ${examId}`);
    }

    // Load the full session data
    const sessionResponse = await supabaseExamService.getSession(session.id, userId);
    
    return { 
      exam: { id: examId },
      session: sessionResponse.session 
    };
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
      // Session updates are now handled by the useOptimizedExamSession hook
      // which syncs with the database automatically
      // This reducer is kept for compatibility but no longer modifies state
    },

    checkAnswer: (state, action: PayloadAction<number>) => {
      // Session updates are now handled by the useOptimizedExamSession hook
      // which syncs with the database automatically
      // This reducer is kept for compatibility but no longer modifies state
    },

    navigateToQuestion: (state, action: PayloadAction<number>) => {
      // Session updates are now handled by the useOptimizedExamSession hook
      // which syncs with the database automatically
      // This reducer is kept for compatibility but no longer modifies state
    },

    nextQuestion: (state) => {
      // Session updates are now handled by the useOptimizedExamSession hook
      // which syncs with the database automatically
      // This reducer is kept for compatibility but no longer modifies state
    },

    previousQuestion: (state) => {
      // Session updates are now handled by the useOptimizedExamSession hook
      // which syncs with the database automatically
      // This reducer is kept for compatibility but no longer modifies state
    },

    resetExamSession: (state) => {
      // Reset state - database cleanup is handled by the useOptimizedExamSession hook
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
