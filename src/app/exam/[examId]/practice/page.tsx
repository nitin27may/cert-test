'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ParsedQuestion } from '@/lib/types';
import Header from '@/components/Header';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedExamSession } from '@/hooks/useOptimizedExamSession';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { realtimeService } from '@/lib/services/realtimeService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Target, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  AlertCircle
} from 'lucide-react';

export default function ExamPracticePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user } = useAuth();
  const [sessionState, sessionActions] = useOptimizedExamSession();
  
  // Check if session ID is passed in URL (from setup page)
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId');

  const [userAnswers, setUserAnswers] = useState<Record<number, number | number[]>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({});
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const bootCompletedRef = useRef(false);

  // Memoize computed values to prevent unnecessary re-renders
  const questions: ParsedQuestion[] = useMemo(() => sessionState.session?.questions || [], [sessionState.session?.questions]);
  const currentQuestionIndex = useMemo(() => sessionState.currentQuestionIndex || 0, [sessionState.currentQuestionIndex]);
  const currentQuestion: ParsedQuestion | undefined = useMemo(() => 
    sessionState.currentQuestion || questions[currentQuestionIndex] || questions[0], 
    [sessionState.currentQuestion, questions, currentQuestionIndex]
  );
  const examTitle = useMemo(() => sessionState.session?.exam_id || examId, [sessionState.session?.exam_id, examId]);

  // Calculate time remaining based on database time spent
  const timeRemaining = useMemo(() => {
    const defaultTimeLimit = 90; // Default 90 minutes
    const total = defaultTimeLimit * 60;
    const timeSpent = sessionState.timeSpent || 0;
    const remaining = total - timeSpent;
    return remaining > 0 ? remaining : 0;
  }, [sessionState.timeSpent]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Start or resume a DB-backed session - only run once
  useEffect(() => {
    // More comprehensive check to prevent boot loops
    if (bootCompletedRef.current || 
        isBooting || 
        !user?.id || 
        !sessionActions.createSession || 
        !sessionActions.loadSession ||
        sessionState.isLoading) {
      
      console.log('Boot skipped:', { 
        bootCompleted: bootCompletedRef.current, 
        isBooting, 
        hasUser: !!user?.id,
        hasCreateSession: !!sessionActions.createSession,
        hasLoadSession: !!sessionActions.loadSession,
        sessionLoading: sessionState.isLoading
      });
      return;
    }
    
    console.log('Starting session boot for exam:', examId);
    
    const boot = async () => {
      setIsBooting(true);
      try {
        // If session ID is passed in URL, load that session directly
        if (sessionIdFromUrl) {
          console.log('Session ID from URL, loading session directly:', sessionIdFromUrl);
          await sessionActions.loadSession(sessionIdFromUrl, user.id);
          console.log('Session loaded from URL');
          bootCompletedRef.current = true;
          return;
        }
        
        // Try to find an existing in-progress or paused session for this exam
        const { sessions } = await supabaseExamService.getUserSessions(user.id);
        
        console.log('Looking for existing sessions:', {
          examId,
          availableSessions: sessions.map(s => ({ id: s.id, exam_id: s.exam_id, status: s.status }))
        });
        
        // Try to find existing session by exact exam_id match first
        let existing = sessions.find(s => s.exam_id === examId && (s.status === 'in_progress' || s.status === 'paused'));
        
        // If no exact match, try to find by exam title (in case examId is a slug)
        if (!existing) {
          existing = sessions.find(s => {
            const examTitle = s.exam_title?.toLowerCase();
            const examIdLower = examId.toLowerCase();
            return (examTitle?.includes(examIdLower) || examIdLower.includes(examTitle || '')) && 
                   (s.status === 'in_progress' || s.status === 'paused');
          });
        }
        
        if (existing) {
          // Resume existing session
          console.log('Found existing session, resuming:', existing.id, 'Status:', existing.status);
          await sessionActions.loadSession(existing.id, user.id);
          console.log('Resumed existing session:', existing.id);
        } else {
          // Create new session
          console.log('No existing session found, creating new session');
          
          // First verify the exam exists in the database
          try {
            const examExists = await supabaseExamService.getExamById(examId);
            if (!examExists.exam) {
              throw new Error(`Exam with ID '${examId}' not found in database`);
            }
            console.log('Exam verified:', examExists.exam.title);
          } catch (examError) {
            console.error('Exam verification failed:', examError);
            throw new Error(`Cannot create session: Exam '${examId}' not found. Please check the exam ID.`);
          }
          
          await sessionActions.createSession(user.id, {
            exam_id: examId,
            selected_topics: [],
            question_limit: 50
          });
          console.log('New session created');
        }
        
        bootCompletedRef.current = true;
        
      } catch (error) {
        console.error('Boot failed:', error);
        // Don't set bootCompleted to true on error, allow retry
      } finally {
        setIsBooting(false);
      }
    };
    
    boot();
  }, [examId, user?.id, sessionActions, sessionState.isLoading, sessionIdFromUrl, isBooting]);

  // Load user answers from session state
  useEffect(() => {
    if (sessionState.answers && sessionState.answers.size > 0 && questions.length > 0) {
      const answersMap: Record<number, number | number[]> = {};
      const checkedMap: Record<number, boolean> = {};
      
      // Map answers from questionId (database) to questionIndex (UI)
      sessionState.answers.forEach((answer, questionId) => {
        // Find the question index by matching the question ID
        const questionIndex = questions.findIndex(q => q.id === questionId);
        if (questionIndex !== -1) {
          answersMap[questionIndex] = answer.user_answer;
          // Mark as checked if the answer has been submitted
          checkedMap[questionIndex] = true;
        }
      });
      
      setUserAnswers(answersMap);
      setCheckedAnswers(checkedMap);
      console.log('Loaded answers from session:', answersMap);
      console.log('Loaded checked answers:', checkedMap);
    }
  }, [sessionState.answers, questions]);

  // Handle answer selection
  const handleAnswerSelect = useCallback(async (optionIndex: number) => {
    if (!currentQuestion || !sessionState.session) return;
    
    try {
      let newAnswer: number | number[];
      
      if (currentQuestion.type === 'multiple') {
        // For multiple choice, toggle the option
        const currentAnswer = userAnswers[currentQuestionIndex] || [];
        const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [currentAnswer];
        
        if (currentArray.includes(optionIndex)) {
          // Remove option if already selected
          newAnswer = currentArray.filter(i => i !== optionIndex);
        } else {
          // Add option if not selected
          newAnswer = [...currentArray, optionIndex];
        }
      } else {
        // For single choice, replace the answer
        newAnswer = optionIndex;
      }
      
      // Update local state immediately for responsive UI
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: newAnswer
      }));
      
      // Save to database - use question ID, not index
      await sessionActions.submitAnswer(currentQuestion.id, Array.isArray(newAnswer) ? newAnswer : [newAnswer]);
      
    } catch (error) {
      console.error('Failed to submit answer:', error);
      // Revert local state on error
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: userAnswers[currentQuestionIndex]
      }));
    }
  }, [currentQuestion, currentQuestionIndex, userAnswers, sessionState.session, sessionActions]);

  // Verify selection state for robust UI updates
  const verifySelectionState = useCallback((questionIndex: number, optionIndex: number): boolean => {
    const userAnswer = userAnswers[questionIndex];
    if (userAnswer === undefined) return false;
    
    if (Array.isArray(userAnswer)) {
      return userAnswer.includes(optionIndex);
    } else {
      return userAnswer === optionIndex;
    }
  }, [userAnswers]);

  const handleNext = useCallback(() => {
    sessionActions.nextQuestion();
    setShowExplanation(false);
  }, [sessionActions.nextQuestion]);

  const handlePrevious = useCallback(() => {
    sessionActions.previousQuestion();
    setShowExplanation(false);
  }, [sessionActions.previousQuestion]);

  const handleCheckAnswer = useCallback(async () => {
    if (!currentQuestion || !sessionState.session) return;
    
    try {
      setShowExplanation(true);
      setCheckedAnswers(prev => ({ ...prev, [currentQuestionIndex]: true }));
      
      // Answer is already saved to database in handleAnswerSelect
      // Just mark it as checked for UI purposes
      console.log('Answer checked successfully');
      
    } catch (error) {
      console.error('Failed to check answer:', error);
      // Revert the check state if there was an error
      setCheckedAnswers(prev => ({ ...prev, [currentQuestionIndex]: false }));
      setShowExplanation(false);
    }
  }, [currentQuestion, sessionState.session, currentQuestionIndex]);

  const handlePauseTest = () => {
    setShowPauseModal(true);
  };

  const handleConfirmPause = async () => {
    if (!sessionState.session) return;
    
    try {
      // Pause the session via the hook (which updates the database)
      await sessionActions.pauseSession();
      
      // Navigate back to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Failed to pause session:', error);
      // Show error to user
      alert('Failed to pause exam. Please try again.');
    }
  };

  const getQuestionStatus = (questionIndex: number) => {
    const hasAnswer = userAnswers.hasOwnProperty(questionIndex);
    const isChecked = checkedAnswers[questionIndex];
    
    if (!hasAnswer) return 'unanswered';
    if (!isChecked) return 'answered';
    
    const userAnswer = userAnswers[questionIndex];
    const question = questions[questionIndex];
    
    if (!question) return 'unknown';
    
    // Handle both old and new question format - use correct_answers from ParsedQuestion
    const correctAnswers = question.correct_answers;
    if (!correctAnswers) return 'unknown';
    
    let isCorrect = false;
    if (question.type === 'multiple') {
      const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
      const correctAnswersArray = Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
      
      // Check if user selected exactly the correct answers
      isCorrect = userAnswerArray.length === correctAnswersArray.length &&
                  userAnswerArray.every(ans => correctAnswersArray.includes(ans));
    } else {
      isCorrect = userAnswer === correctAnswers;
    }
    
    return isCorrect ? 'correct' : 'incorrect';
  };

  // Helper function to check if user got the current question completely correct
  const isCurrentQuestionCorrect = useCallback(() => {
    if (!currentQuestion || !userAnswers.hasOwnProperty(currentQuestionIndex)) return false;
    
    const userAnswer = userAnswers[currentQuestionIndex];
    const correctAnswers = currentQuestion.correct_answers;
    
    if (!correctAnswers) return false;
    
    if (currentQuestion.type === 'multiple') {
      const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
      const correctAnswersArray = Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
      
      // Check if user selected exactly the correct answers
      return userAnswerArray.length === correctAnswersArray.length &&
             userAnswerArray.every(ans => correctAnswersArray.includes(ans));
    } else {
      return userAnswer === correctAnswers;
    }
  }, [currentQuestion, currentQuestionIndex, userAnswers]);

  const handleFinishExam = async () => {
    if (!sessionState.session) return;
    
    try {
      // Complete the session via the database service
      const result = await supabaseExamService.completeSession(sessionState.session.id);
      
      console.log('Exam completed successfully:', result);
      
      // Navigate to results or dashboard
      alert(`Exam completed! Score: ${result.result.score_percentage}%`);
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Failed to complete exam:', error);
      alert('Failed to complete exam. Please try again.');
    }
  };

  // Check if session has questions, if not redirect to setup
  useEffect(() => {
    console.log('Session state changed:', {
      hasSession: !!sessionState.session,
      sessionId: sessionState.session?.id,
      sessionQuestionsCount: sessionState.session?.questions?.length || 0,
      sessionStatus: sessionState.session?.status,
      isLoading: sessionState.isLoading,
      isBooting,
      questionsArrayLength: questions.length,
      currentQuestion: !!currentQuestion,
      questionsArray: questions.slice(0, 3).map(q => ({ id: q.id, question: q.question_text?.substring(0, 50) })) // Show first 3 questions
    });
    
    // Don't redirect if we're still loading or booting
    if (sessionState.isLoading || isBooting) {
      console.log('Still loading or booting, not redirecting');
      return;
    }
    
    // Only redirect if we have a session but no questions
    if (sessionState.session && questions.length === 0) {
      console.log('Session loaded but questions array is empty, redirecting to setup');
      console.log('Debug info:', {
        session: sessionState.session,
        questions: questions,
        questionsLength: questions.length,
        sessionQuestions: sessionState.session.questions
      });
      router.push(`/exam/${examId}/setup`);
    }
  }, [sessionState.session, sessionState.isLoading, router, examId, isBooting, questions.length, currentQuestion]);

  if (sessionState.session && (!sessionState.session.questions || sessionState.session.questions.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-foreground mb-4">
            Redirecting to exam setup...
          </div>
        </div>
      </div>
    );
  }

  // Check loading condition
  const loadingCondition = sessionState.isLoading || !sessionState.session || !currentQuestion || isBooting;

  if (loadingCondition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-lg text-foreground">
            {isBooting ? 'Starting exam session...' : 'Loading session...'}
          </div>
          <div className="text-sm text-muted-foreground">
            Please wait while we prepare your exam
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <Card className="border-destructive/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">No Questions Available</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-muted-foreground">
                This could be due to no questions matching the selected topics or exam data not being properly loaded.
              </p>
              <div className="flex space-x-4 justify-center">
                <Button
                  onClick={() => router.push(`/exam/${examId}/setup`)}
                  variant="outline"
                >
                  Back to Exam Setup
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Remove the duplicate currentQuestion declaration and use the one from sessionState
  const userAnswer = userAnswers[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background transition-colors">
      <Header />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Exam Header */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {sessionState.session?.exam_title || examTitle}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  </span>
                  <span className="flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Button
                  onClick={handlePauseTest}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Test
                </Button>
                
                <div className="text-center bg-muted/50 rounded-lg p-3 min-w-[100px]">
                  <div className="text-2xl font-bold text-foreground">
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Time Remaining
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <Progress 
                value={((currentQuestionIndex + 1) / questions.length) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Question Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Question Card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                {/* Question Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="secondary" className="text-xs">
                    {currentQuestion.topic_id || 'Unknown Topic'}
                  </Badge>
                  {currentQuestion.difficulty && (
                    <Badge variant="outline" className="text-xs">
                      {currentQuestion.difficulty}
                    </Badge>
                  )}
                </div>
                
                                 {/* Question Text */}
                 <div className="mb-6">
                   <div className="flex items-start">
                     <span className="inline-block bg-primary/10 text-primary font-bold px-3 py-1 rounded-lg mr-4 mt-1 flex-shrink-0">
                       Q{currentQuestionIndex + 1}
                     </span>
                     <h2 className="text-xl font-semibold text-foreground leading-relaxed">
                       {currentQuestion.question_text}
                     </h2>
                   </div>
                 </div>

                {/* Question Type Indicator */}
                <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground flex items-center">
                    {currentQuestion.type === 'multiple' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                        Select all correct answers (multiple selection)
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 mr-2 text-blue-500" />
                        Select one answer (single selection)
                      </>
                    )}
                  </p>
                </div>

                {/* Answer Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = verifySelectionState(currentQuestionIndex, index);
                    const isCorrect = currentQuestion.correct_answers.includes(index);
                    const showResult = showExplanation;
                    
                    let optionClasses = "w-full text-left p-4 border rounded-lg transition-all duration-200 hover:shadow-sm ";
                    let iconClasses = "w-5 h-5 mr-3 ";
                    
                    if (showResult) {
                      // After checking answer - show correct/incorrect status
                      if (isCorrect) {
                        optionClasses += "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100";
                        iconClasses += "text-green-600";
                      } else if (isSelected) {
                        optionClasses += "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100";
                        iconClasses += "text-red-600";
                      } else {
                        optionClasses += "bg-background border-border text-foreground";
                        iconClasses += "text-muted-foreground";
                      }
                    } else {
                      // Before checking answer - show selection state
                      if (isSelected) {
                        optionClasses += "bg-primary/10 border-primary text-primary";
                        iconClasses += "text-primary";
                      } else {
                        optionClasses += "bg-background border-border text-foreground hover:bg-muted/50";
                        iconClasses += "text-muted-foreground";
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        className={optionClasses}
                        disabled={showResult}
                      >
                        <div className="flex items-start">
                          {currentQuestion.type === 'multiple' ? (
                            <div className={`w-5 h-5 mr-3 mt-0.5 border-2 rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                              {isSelected && (
                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          ) : (
                            <div className={`w-5 h-5 mr-3 mt-0.5 border-2 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                              {isSelected && <div className="w-2.5 h-2.5 bg-primary-foreground rounded-full"></div>}
                            </div>
                          )}
                          
                          <div className="flex-1 text-left">
                            <span className="font-medium text-sm text-muted-foreground mr-3">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="text-foreground">{option}</span>
                            
                            {/* Status indicator when showing results */}
                            {showResult && (
                              <div className="mt-2 flex items-center space-x-2">
                                {isSelected && (
                                  <Badge 
                                    variant={isCorrect ? "default" : "destructive"}
                                    className="text-xs"
                                  >
                                    {isCorrect ? (
                                      <>
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Correct
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Wrong
                                      </>
                                    )}
                                  </Badge>
                                )}
                                {!isSelected && isCorrect && (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Correct Answer
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showExplanation && (
                  <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-border/50">
                    {/* Score Indicator */}
                    <div className="mb-6 p-4 bg-background rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Question Result:
                        </span>
                        <Badge 
                          variant={isCurrentQuestionCorrect() ? "default" : "destructive"}
                          className="text-sm"
                        >
                          {isCurrentQuestionCorrect() ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Correct
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Incorrect
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Explanation:</h3>
                        <p className="text-muted-foreground leading-relaxed">{currentQuestion.explanation}</p>
                      </div>
                      
                      {currentQuestion.reasoning && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
                              Why this is correct:
                            </h4>
                            <p className="text-muted-foreground">{currentQuestion.reasoning.correct}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">
                              Why other options are wrong:
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(currentQuestion.reasoning.why_others_wrong).map(([key, reason]) => (
                                <div key={key} className="text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {String.fromCharCode(65 + parseInt(key))}.
                                  </span> {reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Reference Link */}
                      {currentQuestion.reference && (
                        <div>
                          <Separator className="my-4" />
                          <div>
                            <h4 className="font-medium text-foreground mb-2">
                              Reference:
                            </h4>
                            <a
                              href={currentQuestion.reference.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 underline hover:no-underline transition-colors inline-flex items-center gap-1"
                            >
                              {currentQuestion.reference.title}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  <Button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    {userAnswer !== undefined && !showExplanation && (
                      <Button
                        onClick={handleCheckAnswer}
                        size="lg"
                        className="w-full sm:w-auto"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Check Answer
                      </Button>
                    )}
                    
                    {currentQuestionIndex === questions.length - 1 ? (
                      <Button
                        onClick={handleFinishExam}
                        size="lg"
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finish Exam
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        size="lg"
                        className="w-full sm:w-auto"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Summary Sidebar */}
          <div className="xl:col-span-1">
            <Card className="border-0 shadow-sm sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Question Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {questions.map((_, index) => {
                    const status = getQuestionStatus(index);
                    const isCurrent = index === currentQuestionIndex;
                    
                    let statusClasses = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 ";
                    
                    if (isCurrent) {
                      statusClasses += "bg-primary text-primary-foreground border-primary";
                    } else if (status === 'correct') {
                      statusClasses += "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700";
                    } else if (status === 'incorrect') {
                      statusClasses += "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700";
                    } else if (status === 'answered') {
                      statusClasses += "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700";
                    } else {
                      statusClasses += "bg-muted text-muted-foreground border-border";
                    }
                    
                    return (
                      <button
                        key={index}
                        className={statusClasses}
                        onClick={() => {
                          // TODO: Implement question navigation
                          console.log('Navigate to question:', index);
                        }}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Answered:</span>
                    <span className="font-medium">{Object.keys(userAnswers).length}/{questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Correct:</span>
                    <span className="font-medium text-green-600">
                      {questions.filter((_, index) => getQuestionStatus(index) === 'correct').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Incorrect:</span>
                    <span className="font-medium text-red-600">
                      {questions.filter((_, index) => getQuestionStatus(index) === 'incorrect').length}
                    </span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-300 dark:bg-green-700 rounded-full"></div>
                    <span>Correct</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-300 dark:bg-red-700 rounded-full"></div>
                    <span>Incorrect</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-300 dark:bg-yellow-700 rounded-full"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-muted rounded-full"></div>
                    <span>Unanswered</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Pause Confirmation Modal */}
      <ConfirmationModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onConfirm={handleConfirmPause}
        title="Pause Exam"
        message="Are you sure you want to pause this exam? You can resume it later from your dashboard."
        confirmText="Pause Exam"
        cancelText="Continue Exam"
      />
    </div>
  );
}
