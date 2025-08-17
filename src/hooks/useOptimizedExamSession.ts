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
  totalQuestions: number;
  isResuming: boolean;
  retryCount: number;
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
  retryFailedAnswers: () => Promise<void>;
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
    lastSyncTime: null,
    totalQuestions: 0,
    isResuming: false,
    retryCount: 0
  });

  // Refs for managers and timers
  const autoSyncManagerRef = useRef<any>(null);
  const timeTrackingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateCounterRef = useRef<number>(0);
  const connectionMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());
  const submitAnswerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingAnswersRef = useRef<Map<number, { userAnswer: number[], timeSpent: number, retryCount: number }>>(new Map());
  const failedAnswersRef = useRef<Map<number, { userAnswer: number[], timeSpent: number, error: string, retryCount: number }>>(new Map());
  const isInitializedRef = useRef<boolean>(false);

  // Helper to update state with debouncing to prevent excessive updates
  const updateState = useCallback((updates: Partial<OptimizedExamSessionState> | ((prev: OptimizedExamSessionState) => OptimizedExamSessionState)) => {
    if (typeof updates === 'function') {
      setState(updates);
    } else {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Calculate progress with proper error handling
  const calculateProgress = useCallback((session: ParsedUserExamSession, answers: Map<number, ParsedUserAnswer>) => {
    if (!session || !session.total_questions || session.total_questions === 0) return 0;
    return Math.round((answers.size / session.total_questions) * 100);
  }, []);

  // Monitor connection status with reduced frequency
  const startConnectionMonitor = useCallback(() => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }

    connectionMonitorRef.current = setInterval(() => {
      const status = realtimeService.getConnectionStatus();
      
      // Only update state if status actually changed
      setState(prev => {
        if (prev.connectionStatus !== status) {
          return { ...prev, connectionStatus: status };
        }
        return prev;
      });
    }, 10000); // Check every 10 seconds instead of continuously
  }, []);

  // Start time tracking with proper cleanup
  const startTimeTracking = useCallback(() => {
    if (timeTrackingTimerRef.current) {
      clearInterval(timeTrackingTimerRef.current);
    }

    timeTrackingTimerRef.current = setInterval(() => {
      updateState(prev => ({
        ...prev,
        timeSpent: prev.timeSpent + 1,
        lastSyncTime: new Date()
      }));

      // Update time spent counter for periodic sync
      timeUpdateCounterRef.current++;
      if (timeUpdateCounterRef.current >= 30) { // Sync every 30 seconds
        timeUpdateCounterRef.current = 0;
        // Trigger background sync for time tracking
        if (state.session) {
          supabaseExamService.updateSession(state.session.id, state.session.user_id, {
            time_spent_seconds: state.timeSpent + 1
          }).catch(console.error); // Don't block UI for time updates
        }
      }
    }, 1000);
  }, [updateState, state.session, state.timeSpent]);

  // Setup real-time sync with better error handling
  const setupRealtimeSync = useCallback(async (sessionId: string, userId: string) => {
    try {
      console.log('Setting up real-time sync for session:', sessionId);
      
      // Subscribe to critical updates only
      await realtimeService.subscribeToExamSession(sessionId, userId, {
        onSessionUpdate: (session) => {
          console.log('Session updated via real-time:', session);
          updateState(prev => ({
            ...prev,
            session: { ...prev.session, ...session },
            syncStatus: 'synced',
            lastSyncTime: new Date()
          }));
        },
        onAnswerUpdate: (answer) => {
          console.log('Answer updated via real-time:', answer);
          updateState(prev => {
            const newAnswers = new Map(prev.answers);
            newAnswers.set(answer.question_id, answer);
            return {
              ...prev,
              answers: newAnswers,
              progress: calculateProgress(prev.session!, newAnswers),
              syncStatus: 'synced',
              lastSyncTime: new Date()
            };
          });
        },
        onError: (error) => {
          console.error('Real-time sync error:', error);
          updateState({ 
            error: error.message,
            syncStatus: 'error'
          });
        }
      });

      // Setup presence tracking with throttling
      const presenceData: UserPresenceData = {
        userId,
        sessionId,
        examId: undefined, // Will be set when session loads
        currentQuestionIndex: 0,
        isActive: true,
        lastSeen: new Date().toISOString()
      };

      await realtimeService.trackUserPresence(sessionId, presenceData, (presences) => {
        updateState({ presences });
      });

      // Setup auto-sync manager with longer intervals
      autoSyncManagerRef.current = realtimeService.createAutoSyncManager(sessionId, {
        batchInterval: 10000, // 10 seconds to reduce calls
        maxBatchSize: 20,     // Increased batch size
        onSyncError: (error) => {
          updateState({ 
            syncStatus: 'error',
            error: error.message 
          });
        }
      });

      console.log('Real-time sync setup completed successfully');
      updateState({ syncStatus: 'synced' });

    } catch (error: any) {
      console.error('Failed to setup real-time sync:', error);
      updateState({ 
        error: error.message,
        syncStatus: 'error'
      });
    }
  }, [updateState, calculateProgress]);

  // Cleanup real-time subscriptions
  const cleanupRealtimeSync = useCallback(async () => {
    if (autoSyncManagerRef.current) {
      await autoSyncManagerRef.current.forceSync();
      autoSyncManagerRef.current.destroy();
      autoSyncManagerRef.current = null;
    }
    await realtimeService.unsubscribeAll();
  }, []);

  // Create session with optimized dependencies
  const createSession = useCallback(async (userId: string, sessionData: CreateSessionRequest) => {
    try {
      updateState({ isLoading: true, error: null, isResuming: false });

      const response = await supabaseExamService.createSession(userId, sessionData);
      
      if (!response.session) {
        throw new Error('Failed to create session');
      }

      // Setup real-time sync immediately after session creation
      await setupRealtimeSync(response.session.id, userId);

      updateState({
        session: response.session,
        currentQuestion: response.session.questions?.[0] || null,
        currentQuestionIndex: 0,
        totalQuestions: response.session.total_questions,
        isLoading: false,
        syncStatus: 'synced',
        isResuming: false
      } as Partial<OptimizedExamSessionState>);

      // Start time tracking
      startTimeTracking();
      isInitializedRef.current = true;

    } catch (error: any) {
      console.error('Failed to create session:', error);
      updateState({ 
        isLoading: false, 
        error: error.message,
        syncStatus: 'error',
        isResuming: false
      });
    }
  }, [updateState, setupRealtimeSync, startTimeTracking]);

  // Load existing session with optimized dependencies and retry logic
  const loadSession = useCallback(async (sessionId: string, userId: string) => {
    try {
      updateState({ isLoading: true, error: null, isResuming: true });

      const response = await supabaseExamService.getSession(sessionId, userId);
      
      if (!response.session) {
        throw new Error('Session not found');
      }

      // Setup real-time sync for existing session
      await setupRealtimeSync(sessionId, userId);

      // Create answers map from loaded answers with proper parsing
      const answersMap = new Map<number, ParsedUserAnswer>();
      if (response.answers) {
        response.answers.forEach(answer => {
          try {
            // Ensure user_answer is properly parsed
            if (typeof answer.user_answer === 'string') {
              answer.user_answer = JSON.parse(answer.user_answer);
            }
            answersMap.set(answer.question_id, answer);
          } catch (parseError) {
            console.error('Failed to parse answer:', answer, parseError);
            // Skip malformed answers
          }
        });
        console.log('Loaded answers from session state:', Object.fromEntries(
          Array.from(answersMap.entries()).map(([k, v]) => [k, v.user_answer])
        ));
      }

      updateState({
        session: response.session,
        currentQuestion: response.session.questions?.[response.session.current_question_index] || null,
        currentQuestionIndex: response.session.current_question_index,
        totalQuestions: response.session.total_questions,
        timeSpent: response.session.time_spent_seconds,
        answers: answersMap,
        progress: calculateProgress(response.session, answersMap),
        isLoading: false,
        syncStatus: 'synced',
        isResuming: false
      } as Partial<OptimizedExamSessionState>);

      console.log('State updated after session loading');

      // Resume time tracking if session is in progress
      if (response.session.status === 'in_progress') {
        startTimeTracking();
      }

      isInitializedRef.current = true;

    } catch (error: any) {
      console.error('Failed to load session:', error);
      updateState({ 
        isLoading: false, 
        error: error.message,
        syncStatus: 'error',
        isResuming: false
      });
      
      // Increment retry count for retry logic
      updateState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
    }
  }, [updateState, setupRealtimeSync, startTimeTracking, calculateProgress]);

  // Optimistic answer submission with proper error handling
  const submitAnswerOptimistic = useCallback(async (questionId: number, userAnswer: number[], timeSpent = 0) => {
    if (!state.session) return;

    const tempId = `temp_${Date.now()}`;
    
    // 1. Optimistic update
    updateState(prev => {
      const newAnswers = new Map(prev.answers);
      const optimisticAnswer: ParsedUserAnswer = {
        id: tempId,
        session_id: state.session!.id,
        question_id: questionId,
        user_answer: userAnswer,
        is_correct: null,
        is_flagged: false,
        time_spent_seconds: timeSpent,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      newAnswers.set(questionId, optimisticAnswer);
      return {
        ...prev,
        answers: newAnswers,
        progress: calculateProgress(prev.session!, newAnswers)
      };
    });

    try {
      // 2. Server update using new API endpoint
      const response = await fetch(`/api/sessions/${state.session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_answer',
          data: { questionId, userAnswer, timeSpent },
          userId: state.session.user_id
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const submittedAnswer = await response.json();

      // 3. Replace optimistic data with real data
      updateState(prev => {
        const newAnswers = new Map(prev.answers);
        newAnswers.set(questionId, submittedAnswer);
        return {
          ...prev,
          answers: newAnswers,
          progress: calculateProgress(prev.session!, newAnswers),
          syncStatus: 'synced',
          lastSyncTime: new Date()
        };
      });

      // Remove from pending/failed if it was there
      pendingAnswersRef.current.delete(questionId);
      failedAnswersRef.current.delete(questionId);

    } catch (error: any) {
      console.error(`Failed to submit answer for question ${questionId}:`, error);
      
      // 4. Rollback on error
      updateState(prev => {
        const newAnswers = new Map(prev.answers);
        newAnswers.delete(questionId);
        return { 
          ...prev, 
          answers: newAnswers,
          progress: calculateProgress(prev.session!, newAnswers),
          syncStatus: 'error',
          error: `Failed to save answer: ${error.message}`
        };
      });
      
      // Queue for retry
      failedAnswersRef.current.set(questionId, { 
        userAnswer, 
        timeSpent, 
        error: error.message, 
        retryCount: 0 
      });
    }
  }, [state.session, updateState, calculateProgress]);

  // Retry failed answers
  const retryFailedAnswers = useCallback(async () => {
    if (failedAnswersRef.current.size === 0) return;

    const failedAnswers = Array.from(failedAnswersRef.current.entries());
    
    for (const [questionId, { userAnswer, timeSpent, retryCount }] of failedAnswers) {
      if (retryCount >= 3) {
        console.error(`Max retries reached for question ${questionId}`);
        continue;
      }

      try {
        await submitAnswerOptimistic(questionId, userAnswer, timeSpent);
      } catch (error: unknown) {
        // Increment retry count
        failedAnswersRef.current.set(questionId, {
          userAnswer,
          timeSpent,
          error: error instanceof Error ? error.message : String(error),
          retryCount: retryCount + 1
        });
      }
    }
  }, [submitAnswerOptimistic]);

  // Debounced submit answer to prevent rapid fire submissions
  const submitAnswerDebounced = useCallback(async () => {
    if (!state.session || pendingAnswersRef.current.size === 0) return;

    const answersToSubmit = Array.from(pendingAnswersRef.current.entries());
    pendingAnswersRef.current.clear();

    try {
      updateState({ syncStatus: 'syncing' });

      // Submit all pending answers using new API endpoint
      for (const [questionId, { userAnswer, timeSpent }] of answersToSubmit) {
        try {
          await submitAnswerOptimistic(questionId, userAnswer, timeSpent);
                } catch (error: unknown) {
          console.error(`Failed to submit answer for question ${questionId}:`, error);
          // Keep the answer in failed state for retry
          failedAnswersRef.current.set(questionId, { 
            userAnswer, 
            timeSpent, 
            error: error instanceof Error ? error.message : String(error), 
            retryCount: 0 
          });
        }
      }

      updateState({ syncStatus: 'synced', lastSyncTime: new Date() });

    } catch (error: any) {
      console.error('Failed to submit answers:', error);
      updateState({
        error: error.message,
        syncStatus: 'error'
      });
    }
  }, [state.session, updateState, submitAnswerOptimistic]);

  const submitAnswer = useCallback(async (questionId: number, userAnswer: number[], timeSpent = 0) => {
    if (!state.session) return;

    // Store the answer for debounced submission
    pendingAnswersRef.current.set(questionId, { userAnswer, timeSpent, retryCount: 0 });

    // Clear existing timeout and set new one
    if (submitAnswerTimeoutRef.current) {
      clearTimeout(submitAnswerTimeoutRef.current);
    }

    submitAnswerTimeoutRef.current = setTimeout(submitAnswerDebounced, 1000); // Increased to 1 second
  }, [state.session, submitAnswerDebounced]);

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

    // Batch these updates to reduce API calls
    try {
      // Update presence and broadcast in parallel
      const promises = [
        realtimeService.updatePresence(state.session.id, {
          currentQuestionIndex: index
        }),
        realtimeService.broadcastSessionEvent(state.session.id, {
          type: 'question_navigated',
          sessionId: state.session.id,
          userId: state.session.user_id,
          data: { questionIndex: index, questionId: question.id }
        })
      ];

      await Promise.all(promises);

      // Persist current question index to DB (debounced)
      await supabaseExamService.updateSession(state.session.id, state.session.user_id, {
        current_question_index: index,
        last_activity: new Date().toISOString()
      } as any);

    } catch (err) {
      // Ignore transient errors to prevent blocking navigation
      console.warn('Failed to sync navigation:', err);
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

      await supabaseExamService.updateSession(state.session.id, state.session.user_id, {
        current_question_index: state.currentQuestionIndex,
        status: 'paused' as SessionStatus,
        last_activity: new Date().toISOString()
      } as any);

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

      // Update DB status
      await supabaseExamService.updateSession(state.session.id, state.session.user_id, {
        status: 'in_progress' as SessionStatus,
        last_activity: new Date().toISOString()
      } as any);

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
    if (submitAnswerTimeoutRef.current) {
      clearTimeout(submitAnswerTimeoutRef.current);
    }
    
    // Clear pending answers
    pendingAnswersRef.current.clear();
    failedAnswersRef.current.clear(); // Clear failed answers on reset
    
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
      lastSyncTime: null,
      totalQuestions: 0,
      isResuming: false,
      retryCount: 0
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

  // Retry failed answers on mount if there are any
  useEffect(() => {
    retryFailedAnswers();
  }, [retryFailedAnswers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (submitAnswerTimeoutRef.current) {
        clearTimeout(submitAnswerTimeoutRef.current);
      }
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
    retryConnection,
    retryFailedAnswers
  };

  return [state, actions];
}