'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ParsedQuestion } from '@/lib/types';
import Header from '@/components/Header';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedExamSession } from '@/hooks/useOptimizedExamSession';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { realtimeService } from '@/lib/services/realtimeService';

export default function ExamPracticePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user } = useAuth();
  const [sessionState, sessionActions] = useOptimizedExamSession();

  const [userAnswers, setUserAnswers] = useState<Record<number, number | number[]>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({});
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const bootCompletedRef = useRef(false);

  const questions: ParsedQuestion[] = useMemo(() => sessionState.session?.questions || [], [sessionState.session]);
  const currentQuestionIndex = sessionState.currentQuestionIndex;
  const currentQuestion: ParsedQuestion | undefined = sessionState.currentQuestion || questions[currentQuestionIndex];
  const examTitle = useMemo(() => sessionState.session?.exam_id || examId, [sessionState.session, examId]);

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
    if (bootCompletedRef.current || isBooting || !user?.id || !sessionActions.createSession || !sessionActions.loadSession) {
      console.log('Boot skipped:', { 
        bootCompleted: bootCompletedRef.current, 
        isBooting, 
        hasUser: !!user?.id,
        hasCreateSession: !!sessionActions.createSession,
        hasLoadSession: !!sessionActions.loadSession
      });
      return;
    }
    
    console.log('Starting session boot for exam:', examId);
    
    const boot = async () => {
      setIsBooting(true);
      try {
        // Try to find an existing in-progress or paused session for this exam
        const { sessions } = await supabaseExamService.getUserSessions(user.id);
        const existing = sessions.find(s => s.exam_id === examId && (s.status === 'in_progress' || s.status === 'paused'));
        
        if (existing) {
          // Resume existing session
          console.log('Found existing session, resuming:', existing.id, 'Status:', existing.status);
          await sessionActions.loadSession(existing.id, user.id);
          console.log('Resumed existing session:', existing.id);
          
          // Check if session was loaded correctly
          setTimeout(() => {
            console.log('Session state after loading:', {
              session: sessionState.session,
              currentQuestion: sessionState.currentQuestion,
              currentQuestionIndex: sessionState.currentQuestionIndex,
              answers: sessionState.answers?.size || 0
            });
          }, 1000);
        } else {
          // Create new session with default config
          console.log('No existing session, creating new one');
          await sessionActions.createSession(user.id, {
            exam_id: examId,
            selected_topics: [], // Will be set by the setup page
            question_limit: 20 // Default question limit
          } as any);
          console.log('Created new session for exam:', examId);
        }
        bootCompletedRef.current = true;
        console.log('Boot completed successfully');
      } catch (error) {
        console.error('Failed to boot session:', error);
        // Fallback: try to create session anyway
        try {
          await sessionActions.createSession(user.id, {
            exam_id: examId,
            selected_topics: [],
            question_limit: 20
          } as any);
          bootCompletedRef.current = true;
          console.log('Fallback session creation succeeded');
        } catch (fallbackError) {
          console.error('Fallback session creation failed:', fallbackError);
        }
      } finally {
        setIsBooting(false);
      }
    };
    
    boot();
  }, [user?.id, examId, isBooting, sessionActions.createSession, sessionActions.loadSession]);

  // Cleanup when examId changes
  useEffect(() => {
    return () => {
      bootCompletedRef.current = false;
      setIsBooting(false);
    };
  }, [examId]);

  // Load answers from database when session loads
  useEffect(() => {
    if (sessionState.session?.id) {
      console.log('Session loaded, attempting to load answers:', {
        sessionId: sessionState.session.id,
        hasAnswers: !!sessionState.answers,
        answersSize: sessionState.answers?.size || 0,
        sessionStatus: sessionState.session.status
      });
      
      // If we have answers in the session state, load them
      if (sessionState.answers && sessionState.answers.size > 0) {
        const answersFromDb: Record<number, number | number[]> = {};
        sessionState.answers.forEach((answer, questionId) => {
          // Find the question index by question ID
          const questionIndex = questions.findIndex(q => q.id === questionId);
          if (questionIndex !== -1) {
            answersFromDb[questionIndex] = answer.user_answer;
          }
        });
        
        setUserAnswers(answersFromDb);
        console.log('Loaded answers from session state:', answersFromDb);
      } else {
        // If no answers in session state, try to load them directly from the database
        loadAnswersFromDatabase(sessionState.session.id);
      }
    } else {
      console.log('No session to load answers from');
    }
  }, [sessionState.session?.id, sessionState.answers, questions]);

  // Function to load answers directly from database
  const loadAnswersFromDatabase = async (sessionId: string) => {
    try {
      console.log('Loading answers directly from database for session:', sessionId);
      const answers = await supabaseExamService.getSessionAnswers(sessionId);

      if (answers && answers.length > 0) {
        const answersFromDb: Record<number, number | number[]> = {};
        answers.forEach((answer: any) => {
          // Find the question index by question ID
          const questionIndex = questions.findIndex(q => q.id === answer.question_id);
          if (questionIndex !== -1) {
            // Parse the user_answer JSON
            try {
              const parsedAnswer = JSON.parse(answer.user_answer);
              answersFromDb[questionIndex] = parsedAnswer;
            } catch (parseError) {
              console.error('Error parsing user_answer:', parseError);
            }
          }
        });
        
        setUserAnswers(answersFromDb);
        console.log('Loaded answers directly from database:', answersFromDb);
      } else {
        console.log('No answers found in database for session:', sessionId);
      }
    } catch (error) {
      console.error('Failed to load answers from database:', error);
    }
  };

  // Remove the duplicate real-time setup since useOptimizedExamSession handles it
  // The hook already sets up real-time sync when a session is created/loaded

  const handleAnswerSelect = async (answerIndex: number) => {
    if (showExplanation) return;
    
    const question = questions[currentQuestionIndex];
    
    // Calculate the new answer value
    let newAnswer: number | number[];
    
    if (question.type === 'multiple') {
      // Handle multiple selection
      const currentAnswers = userAnswers[currentQuestionIndex] as number[] || [];
      const isSelected = currentAnswers.includes(answerIndex);
      
      if (isSelected) {
        // Remove from selection
        newAnswer = currentAnswers.filter(idx => idx !== answerIndex);
      } else {
        // Add to selection
        newAnswer = [...currentAnswers, answerIndex];
      }
    } else {
      // Handle single selection
      newAnswer = answerIndex;
    }

    // Update local state immediately for UI responsiveness
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: newAnswer
    }));

    // Save answer to database immediately
    try {
      const answerArray = Array.isArray(newAnswer) ? newAnswer : [newAnswer];
      
      // Submit answer to database via the session hook
      await sessionActions.submitAnswer(question.id, answerArray, 0);
      console.log('Answer saved to database:', answerArray);
    } catch (error) {
      console.error('Failed to save answer to database:', error);
      // Optionally show error to user
    }
  };

  const handleNext = () => {
    sessionActions.nextQuestion();
    setShowExplanation(false);
  };

  const handlePrevious = () => {
    sessionActions.previousQuestion();
    setShowExplanation(false);
  };

  const handleCheckAnswer = async () => {
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
  };

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

  if (sessionState.isLoading || !sessionState.session || !currentQuestion || isBooting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-white">
          {isBooting ? 'Starting exam session...' : 'Loading session...'}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Questions Available</h1>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3">Debug Information</h3>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 text-left space-y-2">
                  <p><strong>Exam ID:</strong> {examId}</p>
                  <p><strong>Config Loaded:</strong> {sessionState.session ? 'Yes' : 'No'}</p>
                  <p><strong>Selected Topics:</strong> {sessionState.session?.selected_topics?.join(', ') || 'None'}</p>
                  <p><strong>Question Count:</strong> {sessionState.session?.question_limit}</p>
                  <p><strong>Session:</strong> {sessionState.session ? 'Loaded' : 'Not Loaded'}</p>
                  <p><strong>Questions Array:</strong> {questions?.length || 0} questions</p>
                  <p><strong>Error:</strong> {sessionState.error || 'None'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  This could be due to:
                </p>
                <ul className="text-left text-gray-600 dark:text-gray-300 space-y-2 max-w-md mx-auto">
                  <li>• No questions match the selected topics</li>
                  <li>• Topic filtering is too restrictive</li>
                  <li>• Exam data is not properly loaded</li>
                  <li>• Questions array is empty</li>
                </ul>
              </div>
              
              <div className="mt-6 flex space-x-4 justify-center">
                <button
                  onClick={() => router.push(`/exam/${examId}/setup`)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Back to Exam Setup
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Remove the duplicate currentQuestion declaration and use the one from sessionState
  // const currentQuestion = questions[currentQuestionIndex];
  const userAnswer = userAnswers[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{examTitle}</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePauseTest}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
              >
                Pause Test
              </button>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-100 dark:border-gray-700">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                  {/* Find topic name from topic ID */}
                  {currentQuestion.topic_id || 'Unknown Topic'}
                </span>
                {currentQuestion.difficulty && (
                  <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded-full ml-2">
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>
              
              <div className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                {currentQuestion.question_text}
              </div>

              {/* Question type indicator */}
              <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {currentQuestion.type === 'multiple' 
                    ? '📝 Select all correct answers (multiple selection)' 
                    : '🔘 Select one answer (single selection)'
                  }
                </p>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const userAnswer = userAnswers[currentQuestionIndex];
                  const correctAnswers = currentQuestion.correct_answers;
                  
                  let isSelected = false;
                  if (currentQuestion.type === 'multiple') {
                    isSelected = Array.isArray(userAnswer) && userAnswer.includes(index);
                  } else {
                    isSelected = userAnswer === index;
                  }
                  
                  const isCorrect = correctAnswers.includes(index);
                  const showResult = showExplanation;
                  
                  let buttonClass = "w-full text-left p-4 border rounded-lg transition-colors ";
                  
                  if (showResult) {
                    if (isCorrect) {
                      buttonClass += "bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-600 text-green-800 dark:text-green-300";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-600 text-red-800 dark:text-red-300";
                    } else {
                      buttonClass += "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400";
                    }
                  } else {
                    if (isSelected) {
                      buttonClass += "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 text-blue-800 dark:text-blue-300";
                    } else {
                      buttonClass += "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700";
                    }
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={buttonClass}
                    >
                      <div className="flex items-center">
                        {currentQuestion.type === 'multiple' ? (
                          <div className={`w-4 h-4 mr-3 border-2 rounded ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        ) : (
                          <div className={`w-4 h-4 mr-3 border-2 rounded-full ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                        )}
                        <span className="font-medium mr-3 min-w-[24px]">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span className="flex-1">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Explanation:</h3>
                  <p className="text-blue-800 dark:text-blue-300 mb-4">{currentQuestion.explanation}</p>
                  
                  {currentQuestion.reasoning && (
                    <>
                      <div className="text-sm">
                        <div className="font-semibold text-green-800 dark:text-green-300 mb-2">
                          Why this is correct:
                        </div>
                        <p className="text-green-700 dark:text-green-400 mb-4">{currentQuestion.reasoning.correct}</p>
                        
                        <div className="font-semibold text-red-800 dark:text-red-300 mb-2">
                          Why other options are wrong:
                        </div>
                        {Object.entries(currentQuestion.reasoning.why_others_wrong).map(([key, reason]) => (
                          <div key={key} className="text-red-700 dark:text-red-400 mb-2">
                            <span className="font-medium">
                              {String.fromCharCode(65 + parseInt(key))}.
                            </span> {reason}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* Reference Link */}
                  {currentQuestion.reference && (
                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                      <div className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                        📚 Reference:
                      </div>
                      <a
                        href={currentQuestion.reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline hover:no-underline transition-colors inline-flex items-center gap-1"
                      >
                        {currentQuestion.reference.title}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex space-x-3">
                  {userAnswer !== undefined && !showExplanation && (
                    <button
                      onClick={handleCheckAnswer}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                      Check Answer
                    </button>
                  )}
                  
                  {currentQuestionIndex === questions.length - 1 ? (
                    <button
                      onClick={handleFinishExam}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Finish Exam
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Question Overview</h3>
              
              {/* Question Dots Grid */}
              <div className="grid grid-cols-5 gap-3 mb-4">
                {questions.map((_, index) => {
                  const status = getQuestionStatus(index);
                  const isActive = index === currentQuestionIndex;
                  
                  let dotClass = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-colors ";
                  
                  if (isActive) {
                    dotClass += "ring-2 ring-blue-500 ring-offset-1 ";
                  }
                  
                  switch (status) {
                    case 'correct':
                      dotClass += "bg-green-500 text-white";
                      break;
                    case 'incorrect':
                      dotClass += "bg-red-500 text-white";
                      break;
                    case 'answered':
                      dotClass += "bg-yellow-500 text-white";
                      break;
                    case 'unanswered':
                      dotClass += "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500";
                      break;
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        // Use the session hook to navigate to question
                        sessionActions.navigateToQuestion(index);
                        setShowExplanation(false);
                      }}
                      className={dotClass}
                      title={`Question ${index + 1} - ${status}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-900 dark:text-white">Correct</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-gray-900 dark:text-white">Incorrect</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-gray-900 dark:text-white">Answered</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded-full mr-2"></div>
                  <span className="text-gray-900 dark:text-white">Unanswered</span>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between mb-1">
                    <span>Answered:</span>
                    <span>{Object.keys(userAnswers).length}/{questions.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Checked:</span>
                    <span>{Object.keys(checkedAnswers).length}/{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span>{Math.round((Object.keys(userAnswers).length / questions.length) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onConfirm={handleConfirmPause}
        title="Pause Test"
        message="Are you sure you want to pause this test? Your progress will be saved."
        confirmText="Pause Test"
        cancelText="Continue Test"
      />
    </div>
  );
}
