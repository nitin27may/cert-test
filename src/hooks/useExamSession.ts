/**
 * React hook for managing exam sessions with real-time sync
 * 
 * This hook provides comprehensive exam session management with:
 * - Real-time auto-save functionality
 * - Session state management
 * - Progress tracking
 * - Answer submission with validation
 * - Resume capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseExamService } from '../lib/services/supabaseService';
import { supabase } from '../lib/supabase';
import {
  ParsedUserExamSession,
  ParsedQuestion,
  ParsedUserAnswer,
  CreateSessionRequest,
  SubmitAnswerRequest,
  SessionStatus,
  SessionUpdateEvent,
  AnswerUpdateEvent
} from '../lib/types';

interface UseExamSessionOptions {
  autoSaveInterval?: number; // milliseconds
  enableRealTimeSync?: boolean;
}

interface ExamSessionState {
  session: ParsedUserExamSession | null;
  currentQuestion: ParsedQuestion | null;
  currentQuestionIndex: number;
  answers: Map<number, ParsedUserAnswer>;
  isLoading: boolean;
  error: string | null;
  isAutoSaving: boolean;
  lastSaveTime: Date | null;
  timeSpent: number; // seconds
  progress: number; // percentage
}

interface ExamSessionActions {
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
  updateTimeSpent: (additionalSeconds: number) => void;
}

export function useExamSession(
  options: UseExamSessionOptions = {}
): [ExamSessionState, ExamSessionActions] {
  const {
    autoSaveInterval = 30000, // 30 seconds
    enableRealTimeSync = true
  } = options;

  // State
  const [state, setState] = useState<ExamSessionState>({
    session: null,
    currentQuestion: null,
    currentQuestionIndex: 0,
    answers: new Map(),
    isLoading: false,
    error: null,
    isAutoSaving: false,
    lastSaveTime: null,
    timeSpent: 0,
    progress: 0
  });

  // Refs for timers and tracking
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeTrackingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const lastActivityRef = useRef<Date>(new Date());
  const realtimeChannelRef = useRef<any>(null);

  // Helper to update state
  const updateState = useCallback((updates: Partial<ExamSessionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!state.session) return;

    try {
      updateState({ isAutoSaving: true });

      await supabaseExamService.updateSession(
        state.session.id,
        state.session.user_id,
        {
          current_question_index: state.currentQuestionIndex,
          time_spent_seconds: state.timeSpent,
          last_activity: new Date().toISOString()
        }
      );

      updateState({
        lastSaveTime: new Date(),
        isAutoSaving: false
      });

    } catch (error: any) {
      console.error('Auto-save failed:', error);
      updateState({
        isAutoSaving: false,
        error: `Auto-save failed: ${error.message}`
      });
    }
  }, [state.session, state.currentQuestionIndex, state.timeSpent, updateState]);

  // Start auto-save timer
  const startAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setInterval(autoSave, autoSaveInterval);
  }, [autoSave, autoSaveInterval]);

  // Stop auto-save timer
  const stopAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // Time tracking
  const startTimeTracking = useCallback(() => {
    startTimeRef.current = new Date();
    
    if (timeTrackingTimerRef.current) {
      clearInterval(timeTrackingTimerRef.current);
    }

    timeTrackingTimerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const currentTime = new Date();
        const additionalTime = Math.floor((currentTime.getTime() - lastActivityRef.current.getTime()) / 1000);
        
        if (additionalTime > 0) {
          setState((prev: ExamSessionState) => ({
            ...prev,
            timeSpent: prev.timeSpent + additionalTime
          }));
          lastActivityRef.current = currentTime;
        }
      }
    }, 1000);
  }, [setState]);

  const stopTimeTracking = useCallback(() => {
    if (timeTrackingTimerRef.current) {
      clearInterval(timeTrackingTimerRef.current);
      timeTrackingTimerRef.current = null;
    }
  }, []);

  // Real-time sync setup
  const setupRealTimeSync = useCallback((sessionId: string) => {
    if (!enableRealTimeSync) return;

    // Subscribe to session updates
    realtimeChannelRef.current = supabase
      .channel(`exam_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_exam_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const event: SessionUpdateEvent = {
            type: 'session_update',
            session_id: sessionId,
            data: payload.new as any
          };
          handleRealTimeEvent(event);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_answers',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const event: AnswerUpdateEvent = {
              type: 'answer_update',
              session_id: sessionId,
              question_id: payload.new.question_id,
              data: {
                ...payload.new,
                user_answer: JSON.parse(payload.new.user_answer)
              } as ParsedUserAnswer
            };
            handleRealTimeEvent(event);
          }
        }
      )
      .subscribe();
  }, [enableRealTimeSync]);

  const cleanupRealTimeSync = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, []);

  const handleRealTimeEvent = useCallback((event: SessionUpdateEvent | AnswerUpdateEvent) => {
    switch (event.type) {
      case 'session_update':
        // Update session data from real-time event
        setState((prev: ExamSessionState) => ({
          ...prev,
          session: prev.session ? { ...prev.session, ...event.data } : null
        }));
        break;

      case 'answer_update':
        // Update answers map with new/updated answer
        setState((prev: ExamSessionState) => ({
          ...prev,
          answers: new Map(prev.answers).set(event.question_id, event.data)
        }));
        break;
    }
  }, []);

  // Calculate progress
  const calculateProgress = useCallback((session: ParsedUserExamSession, answers: Map<number, ParsedUserAnswer>) => {
    if (!session || session.total_questions === 0) return 0;
    return (answers.size / session.total_questions) * 100;
  }, []);

  // Actions
  const createSession = useCallback(async (userId: string, sessionData: CreateSessionRequest) => {
    try {
      updateState({ isLoading: true, error: null });

      const response = await supabaseExamService.createSession(userId, sessionData);
      const session = response.session;

      // Load existing answers if resuming
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

      // Setup real-time sync and auto-save
      setupRealTimeSync(session.id);
      startAutoSave();
      startTimeTracking();

    } catch (error: any) {
      updateState({
        isLoading: false,
        error: error.message
      });
    }
  }, [updateState, calculateProgress, setupRealTimeSync, startAutoSave, startTimeTracking]);

  const loadSession = useCallback(async (sessionId: string, userId: string) => {
    try {
      updateState({ isLoading: true, error: null });

      const response = await supabaseExamService.getSession(sessionId, userId);
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

      // Setup real-time sync and auto-save
      setupRealTimeSync(session.id);
      startAutoSave();
      startTimeTracking();

    } catch (error: any) {
      updateState({
        isLoading: false,
        error: error.message
      });
    }
  }, [updateState, calculateProgress, setupRealTimeSync, startAutoSave, startTimeTracking]);

  const submitAnswer = useCallback(async (questionId: number, userAnswer: number[], timeSpent = 0) => {
    if (!state.session) return;

    try {
      const answerData: SubmitAnswerRequest = {
        question_id: questionId,
        user_answer: userAnswer,
        time_spent_seconds: timeSpent
      };

      const submittedAnswer = await supabaseExamService.submitAnswer(state.session.id, answerData);

      // Update local state
      setState((prev: ExamSessionState) => ({
        ...prev,
        answers: new Map(prev.answers).set(questionId, submittedAnswer),
        progress: calculateProgress(prev.session!, new Map(prev.answers).set(questionId, submittedAnswer))
      }));

      // Trigger auto-save
      await autoSave();

    } catch (error: any) {
      updateState({ error: error.message });
    }
  }, [state.session, updateState, calculateProgress, autoSave]);

  const flagQuestion = useCallback(async (questionId: number, flagged: boolean) => {
    if (!state.session) return;

    try {
      const existingAnswer = state.answers.get(questionId);
      const answerData: SubmitAnswerRequest = {
        question_id: questionId,
        user_answer: existingAnswer?.user_answer || [],
        is_flagged: flagged
      };

      const updatedAnswer = await supabaseExamService.submitAnswer(state.session.id, answerData);

      setState((prev: ExamSessionState) => ({
        ...prev,
        answers: new Map(prev.answers).set(questionId, updatedAnswer)
      }));

    } catch (error: any) {
      updateState({ error: error.message });
    }
  }, [state.session, state.answers, updateState]);

  const navigateToQuestion = useCallback((index: number) => {
    if (!state.session || index < 0 || index >= state.session.questions.length) return;

    const question = state.session.questions[index];
    updateState({
      currentQuestionIndex: index,
      currentQuestion: question
    });
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
      await supabaseExamService.updateSession(
        state.session.id,
        state.session.user_id,
        { current_question_index: state.currentQuestionIndex }
      );

      stopAutoSave();
      stopTimeTracking();

      setState((prev: ExamSessionState) => ({
        ...prev,
        session: prev.session ? { ...prev.session, status: 'paused' as SessionStatus } : null
      }));

    } catch (error: any) {
      updateState({ error: error.message });
    }
  }, [state.session, state.currentQuestionIndex, stopAutoSave, stopTimeTracking, updateState]);

  const resumeSession = useCallback(async () => {
    if (!state.session) return;

    try {
      startAutoSave();
      startTimeTracking();

      setState((prev: ExamSessionState) => ({
        ...prev,
        session: prev.session ? { ...prev.session, status: 'in_progress' as SessionStatus } : null
      }));

    } catch (error: any) {
      updateState({ error: error.message });
    }
  }, [state.session, startAutoSave, startTimeTracking, updateState]);

  const completeSession = useCallback(async () => {
    if (!state.session) return;

    try {
      updateState({ isLoading: true });

      // Final save before completion
      await autoSave();

      // Complete the session
      await supabaseExamService.completeSession(state.session.id);

      // Cleanup
      stopAutoSave();
      stopTimeTracking();
      cleanupRealTimeSync();

      setState((prev: ExamSessionState) => ({
        ...prev,
        session: prev.session ? { ...prev.session, status: 'completed' as SessionStatus } : null,
        isLoading: false
      }));

    } catch (error: any) {
      updateState({
        isLoading: false,
        error: error.message
      });
    }
  }, [state.session, autoSave, stopAutoSave, stopTimeTracking, cleanupRealTimeSync, updateState]);

  const resetSession = useCallback(() => {
    stopAutoSave();
    stopTimeTracking();
    cleanupRealTimeSync();

    setState({
      session: null,
      currentQuestion: null,
      currentQuestionIndex: 0,
      answers: new Map(),
      isLoading: false,
      error: null,
      isAutoSaving: false,
      lastSaveTime: null,
      timeSpent: 0,
      progress: 0
    });
  }, [stopAutoSave, stopTimeTracking, cleanupRealTimeSync]);

  const updateTimeSpent = useCallback((additionalSeconds: number) => {
    setState((prev: ExamSessionState) => ({
      ...prev,
      timeSpent: prev.timeSpent + additionalSeconds
    }));
  }, [setState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoSave();
      stopTimeTracking();
      cleanupRealTimeSync();
    };
  }, [stopAutoSave, stopTimeTracking, cleanupRealTimeSync]);

  // Auto-save when component unmounts or page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state.session) {
        autoSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.session, autoSave]);

  const actions: ExamSessionActions = {
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
    updateTimeSpent
  };

  return [state, actions];
}