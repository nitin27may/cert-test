/**
 * Optimized Exam Session Hook with Automatic Sync
 * 
 * This hook uses Supabase's optimized real-time features for:
 * - Automatic data synchronization
 * - Real-time presence tracking
 * - Optimized batched updates
 * - Seamless offline/online handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseExamService } from '../lib/services/supabaseService';
import { realtimeService, SessionBroadcastData, UserPresenceData } from '../lib/services/realtimeService';
import {
  ParsedUserExamSession,
  ParsedQuestion,
  ParsedUserAnswer,
  CreateSessionRequest,
  SubmitAnswerRequest,
  SessionStatus
} from '../lib/types';

interface OptimizedExamSessionState {
  session: ParsedUserExamSession | null;
  currentQuestion: ParsedQuestion | null;
  currentQuestionIndex: number;
  answers: Map<number, ParsedUserAnswer>;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  timeSpent: number;
  progress: number;
  presences: UserPresenceData[];
  lastSyncTime: Date | null;
}

interface OptimizedExamSessionActions {
  createSession: (userId: string, sessionData: CreateSessionRequest) => Promise<void>;
  loadSession: (sessionId: string, userId: string) => Promise<void>;
  submitAnswer: (questionId: number, userAnswer: number[], timeSpent?: number) => Promise<void>;
  flagQuestion: (questionId: number, flagged: boolean) => Promise<void>;
  navigateToQuestion: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: () => Promise<void>;
  resetSession: () => void;
  forceSync: () => Promise<void>;
  retryConnection: () => Promise<void>;
}

export function useOptimizedExamSession(): [OptimizedExamSessionState, OptimizedExamSessionActions] {
  const [state, setState] = useState<OptimizedExamSessionState>({
    session: null,
    currentQuestion: null,
    currentQuestionIndex: 0,
    answers: new Map(),
    isLoading: false,
    error: null,
    connectionStatus: 'CLOSED',
    syncStatus: 'synced',
    timeSpent: 0,
    progress: 0,
    presences: [],
    lastSyncTime: null
  });

  // Refs for managers and timers
  const autoSyncManagerRef = useRef<any>(null);
  const timeTrackingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());

  // Helper to update state
  const updateState = useCallback((updates: Partial<OptimizedExamSessionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Monitor connection status
  const startConnectionMonitor = useCallback(() => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }

    connectionMonitorRef.current = setInterval(() => {
      const status = realtimeService.getConnectionStatus();
      updateState({ connectionStatus: status });

      // Update sync status based on connection
      if (status === 'OPEN') {
        updateState({ syncStatus: 'synced' });
      } else if (status === 'CONNECTING') {
        updateState({ syncStatus: 'syncing' });
      } else {
        updateState({ syncStatus: 'offline' });
      }
    }, 1000);
  }, [updateState]);

  // Start time tracking
  const startTimeTracking = useCallback(() => {
    if (timeTrackingTimerRef.current) {
      clearInterval(timeTrackingTimerRef.current);
    }

    timeTrackingTimerRef.current = setInterval(() => {
      const now = new Date();
      const timeDiff = Math.floor((now.getTime() - lastActivityRef.current.getTime()) / 1000);
      
      if (timeDiff > 0) {
        updateState(prev => ({
          ...prev,
          timeSpent: prev.timeSpent + timeDiff
        }));
        lastActivityRef.current = now;

        // Queue time update for sync
        if (autoSyncManagerRef.current) {
          autoSyncManagerRef.current.queueSync('time_update', {
            timeSpent: state.timeSpent + timeDiff,
            lastActivity: now.toISOString()
          });
        }
      }
    }, 1000);
  }, [updateState, state.timeSpent]);

  // Calculate progress
  const calculateProgress = useCallback((session: ParsedUserExamSession, answers: Map<number, ParsedUserAnswer>) => {
    if (!session || session.total_questions === 0) return 0;
    return (answers.size / session.total_questions) * 100;
  }, []);

  // Setup real-time subscriptions for a session
  const setupRealtimeSync = useCallback(async (sessionId: string, userId: string) => {
    try {
      // Setup exam session subscription with automatic sync
      await realtimeService.subscribeToExamSession(sessionId, userId, {
        onSessionUpdate: (sessionUpdate) => {
          updateState(prev => ({
            ...prev,
            session: prev.session ? { ...prev.session, ...sessionUpdate } : null,
            lastSyncTime: new Date()
          }));
        },

        onAnswerUpdate: (answer) => {
          updateState(prev => {
            const newAnswers = new Map(prev.answers);
            newAnswers.set(answer.question_id, answer);
            return {
              ...prev,
              answers: newAnswers,
              progress: calculateProgress(prev.session!, newAnswers),
              lastSyncTime: new Date()
            };
          });
        },

        onBroadcast: (data: SessionBroadcastData) => {
          console.log('Received broadcast:', data);
          // Handle broadcast events like other users' actions
        },

        onError: (error) => {
          console.error('Real-time subscription error:', error);
          updateState({ 
            error: error.message,
            syncStatus: 'error'
          });
        }
      });

      // Setup presence tracking
      const presenceData: UserPresenceData = {
        userId,
        sessionId,
        examId: state.session?.exam_id,
        currentQuestionIndex: state.currentQuestionIndex,
        isActive: true,
        lastSeen: new Date().toISOString()
      };

      await realtimeService.trackUserPresence(sessionId, presenceData, (presences) => {
        updateState({ presences });
      });

      // Setup auto-sync manager
      autoSyncManagerRef.current = realtimeService.createAutoSyncManager(sessionId, {
        batchInterval: 3000, // 3 seconds for exam sessions
        maxBatchSize: 5,
        onSyncError: (error) => {
          updateState({ 
            syncStatus: 'error',
            error: error.message 
          });
        }
      });

      updateState({ syncStatus: 'synced' });

    } catch (error: any) {
      console.error('Failed to setup real-time sync:', error);
      updateState({ 
        error: error.message,
        syncStatus: 'error'
      });
    }
  }, [updateState, calculateProgress, state.session, state.currentQuestionIndex]);

  // Cleanup real-time subscriptions
  const cleanupRealtimeSync = useCallback(async () => {
    if (autoSyncManagerRef.current) {
      await autoSyncManagerRef.current.forceSync();
      autoSyncManagerRef.current.destroy();
      autoSyncManagerRef.current = null;
    }
    await realtimeService.unsubscribeAll();
  }, []);

  // Actions
  const createSession = useCallback(async (userId: string, sessionData: CreateSessionRequest) => {
    try {
      updateState({ isLoading: true, error: null, syncStatus: 'syncing' });

      const response = await supabaseExamService.createSession(userId, sessionData);
      const session = response.session;

      // Load existing answers
      const existingAnswers = await supabaseExamService.getSessionAnswers(session.id);
      const answersMap = new Map(existingAnswers.map(answer => [answer.question_id, answer]));

      const currentQuestion = session.questions[session.current_question_index] || session.questions[0];
      const progress = calculateProgress(session, answersMap);

      updateState({
        session,
        currentQuestion,
        currentQuestionIndex: session.current_question_index,
        answers: answersMap,
        timeSpent: session.time_spent_seconds,
        progress,
        isLoading: false
      });

      // Setup real-time sync
      await setupRealtimeSync(session.id, userId);
      startTimeTracking();
      startConnectionMonitor();

    } catch (error: any) {
      updateState({
        isLoading: false,
        error: error.message,
        syncStatus: 'error'
      });
    }
  }, [updateState, calculateProgress, setupRealtimeSync, startTimeTracking, startConnectionMonitor]);

  const loadSession = useCallback(async (sessionId: string, userId: string) => {
    try {
      updateState({ isLoading: true, error: null, syncStatus: 'syncing' });

      const response = await supabaseExamService.getSession(sessionId, userId);
      const session = response.session;

      const existingAnswers = await supabaseExamService.getSessionAnswers(session.id);
      const answersMap = new Map(existingAnswers.map(answer => [answer.question_id, answer]));

      const currentQuestion = session.questions[session.current_question_index] || session.questions[0];
      const progress = calculateProgress(session, answersMap);

      updateState({
        session,
        currentQuestion,
        currentQuestionIndex: session.current_question_index,
        answers: answersMap,
        timeSpent: session.time_spent_seconds,
        progress,
        isLoading: false
      });

      // Setup real-time sync
      await setupRealtimeSync(session.id, userId);
      startTimeTracking();
      startConnectionMonitor();

    } catch (error: any) {
      updateState({
        isLoading: false,
        error: error.message,
        syncStatus: 'error'
      });
    }
  }, [updateState, calculateProgress, setupRealtimeSync, startTimeTracking, startConnectionMonitor]);

  const submitAnswer = useCallback(async (questionId: number, userAnswer: number[], timeSpent = 0) => {
    if (!state.session) return;

    try {
      updateState({ syncStatus: 'syncing' });

      const answerData: SubmitAnswerRequest = {
        question_id: questionId,
        user_answer: userAnswer,
        time_spent_seconds: timeSpent
      };

      // Optimistic update
      const optimisticAnswer: ParsedUserAnswer = {
        id: `temp_${questionId}`,
        session_id: state.session.id,
        question_id: questionId,
        user_answer: userAnswer,
        is_correct: null, // Will be calculated server-side
        is_flagged: false,
        time_spent_seconds: timeSpent,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      updateState(prev => {
        const newAnswers = new Map(prev.answers);
        newAnswers.set(questionId, optimisticAnswer);
        return {
          ...prev,
          answers: newAnswers,
          progress: calculateProgress(prev.session!, newAnswers)
        };
      });

      // Submit to server (this will trigger real-time update)
      const submittedAnswer = await supabaseExamService.submitAnswer(state.session.id, answerData);

      // Broadcast to other clients
      await realtimeService.broadcastSessionEvent(state.session.id, {
        type: 'answer_submitted',
        sessionId: state.session.id,
        userId: state.session.user_id,
        data: { questionId, userAnswer, timeSpent }
      });

      updateState({ syncStatus: 'synced', lastSyncTime: new Date() });

    } catch (error: any) {
      // Revert optimistic update on error
      updateState(prev => {
        const newAnswers = new Map(prev.answers);
        newAnswers.delete(questionId);
        return {
          ...prev,
          answers: newAnswers,
          progress: calculateProgress(prev.session!, newAnswers),
          error: error.message,
          syncStatus: 'error'
        };
      });
    }
  }, [state.session, updateState, calculateProgress]);

  const flagQuestion = useCallback(async (questionId: number, flagged: boolean) => {
    if (!state.session) return;

    try {
      const existingAnswer = state.answers.get(questionId);
      const answerData: SubmitAnswerRequest = {
        question_id: questionId,
        user_answer: existingAnswer?.user_answer || [],
        is_flagged: flagged
      };

      await supabaseExamService.submitAnswer(state.session.id, answerData);

    } catch (error: any) {
      updateState({ error: error.message });
    }
  }, [state.session, state.answers, updateState]);

  const navigateToQuestion = useCallback(async (index: number) => {
    if (!state.session || index < 0 || index >= state.session.questions.length) return;

    const question = state.session.questions[index];
    updateState({
      currentQuestionIndex: index,
      currentQuestion: question
    });

    // Update presence
    if (state.session) {
      await realtimeService.updatePresence(state.session.id, {
        currentQuestionIndex: index
      });

      // Broadcast navigation
      await realtimeService.broadcastSessionEvent(state.session.id, {
        type: 'question_navigated',
        sessionId: state.session.id,
        userId: state.session.user_id,
        data: { questionIndex: index, questionId: question.id }
      });

      // Queue for auto-sync
      if (autoSyncManagerRef.current) {
        autoSyncManagerRef.current.queueSync('navigation', {
          currentQuestionIndex: index
        });
      }
    }
  }, [state.session, updateState]);

  const nextQuestion = useCallback(() => {
    if (!state.session) return;
    const nextIndex = Math.min(state.currentQuestionIndex + 1, state.session.questions.length - 1);
    navigateToQuestion(nextIndex);
  }, [state.session, state.currentQuestionIndex, navigateToQuestion]);

  const previousQuestion = useCallback(() => {
    const prevIndex = Math.max(state.currentQuestionIndex - 1, 0);
    navigateToQuestion(prevIndex);
  }, [state.currentQuestionIndex, navigateToQuestion]);

  const pauseSession = useCallback(async () => {
    if (!state.session) return;

    try {
      // Force sync before pausing
      if (autoSyncManagerRef.current) {
        await autoSyncManagerRef.current.forceSync();
      }

      await supabaseExamService.updateSession(
        state.session.id,
        state.session.user_id,
        { current_question_index: state.currentQuestionIndex }
      );

      // Broadcast pause event
      await realtimeService.broadcastSessionEvent(state.session.id, {
        type: 'session_paused',
        sessionId: state.session.id,
        userId: state.session.user_id,
        data: { currentQuestionIndex: state.currentQuestionIndex }
      });

      updateState(prev => ({
        ...prev,
        session: prev.session ? { ...prev.session, status: 'paused' as SessionStatus } : null
      }));

    } catch (error: any) {
      updateState({ error: error.message });
    }
  }, [state.session, state.currentQuestionIndex, updateState]);

  const resumeSession = useCallback(async () => {
    if (!state.session) return;

    try {
      startTimeTracking();

      updateState(prev => ({
        ...prev,
        session: prev.session ? { ...prev.session, status: 'in_progress' as SessionStatus } : null
      }));

    } catch (error: any) {
      updateState({ error: error.message });
    }
  }, [state.session, startTimeTracking, updateState]);

  const completeSession = useCallback(async () => {
    if (!state.session) return;

    try {
      updateState({ isLoading: true, syncStatus: 'syncing' });

      // Force final sync
      if (autoSyncManagerRef.current) {
        await autoSyncManagerRef.current.forceSync();
      }

      // Complete the session
      await supabaseExamService.completeSession(state.session.id);

      // Broadcast completion
      await realtimeService.broadcastSessionEvent(state.session.id, {
        type: 'session_completed',
        sessionId: state.session.id,
        userId: state.session.user_id,
        data: { finalScore: state.progress, timeSpent: state.timeSpent }
      });

      // Cleanup
      await cleanupRealtimeSync();

      updateState(prev => ({
        ...prev,
        session: prev.session ? { ...prev.session, status: 'completed' as SessionStatus } : null,
        isLoading: false,
        syncStatus: 'synced'
      }));

    } catch (error: any) {
      updateState({
        isLoading: false,
        error: error.message,
        syncStatus: 'error'
      });
    }
  }, [state.session, state.progress, state.timeSpent, updateState, cleanupRealtimeSync]);

  const resetSession = useCallback(async () => {
    if (timeTrackingTimerRef.current) {
      clearInterval(timeTrackingTimerRef.current);
    }
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }
    
    await cleanupRealtimeSync();

    setState({
      session: null,
      currentQuestion: null,
      currentQuestionIndex: 0,
      answers: new Map(),
      isLoading: false,
      error: null,
      connectionStatus: 'CLOSED',
      syncStatus: 'synced',
      timeSpent: 0,
      progress: 0,
      presences: [],
      lastSyncTime: null
    });
  }, [cleanupRealtimeSync]);

  const forceSync = useCallback(async () => {
    if (autoSyncManagerRef.current) {
      try {
        updateState({ syncStatus: 'syncing' });
        await autoSyncManagerRef.current.forceSync();
        updateState({ syncStatus: 'synced', lastSyncTime: new Date() });
      } catch (error: any) {
        updateState({ syncStatus: 'error', error: error.message });
      }
    }
  }, [updateState]);

  const retryConnection = useCallback(async () => {
    if (state.session) {
      try {
        updateState({ syncStatus: 'syncing' });
        await setupRealtimeSync(state.session.id, state.session.user_id);
        updateState({ syncStatus: 'synced', error: null });
      } catch (error: any) {
        updateState({ syncStatus: 'error', error: error.message });
      }
    }
  }, [state.session, setupRealtimeSync, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetSession();
    };
  }, [resetSession]);

  const actions: OptimizedExamSessionActions = {
    createSession,
    loadSession,
    submitAnswer,
    flagQuestion,
    navigateToQuestion,
    nextQuestion,
    previousQuestion,
    pauseSession,
    resumeSession,
    completeSession,
    resetSession,
    forceSync,
    retryConnection
  };

  return [state, actions];
}