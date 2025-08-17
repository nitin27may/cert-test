'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExamData } from '@/hooks/useExamData';
import { useExamState } from '@/hooks/useExamState';
import { Question } from '@/lib/types';
import Header from '@/components/Header';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/lib/auth/authService';

interface ExamConfig {
  selectedTopics: string[];
  questionCount: number;
  timeLimit: number;
  difficulty?: string;
}

export default function ExamPracticePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user } = useAuth();
  
  // Helper function to update exam progress in localStorage (can be moved to Supabase later)
  const updateExamProgress = async (examId: string, progress: any) => {
    try {
      const session = await AuthService.getSession();
      const userId = session?.user?.id || 'anonymous';
      const userDataKey = `userData_${userId}`;
      
      const stored = localStorage.getItem(userDataKey);
      const userData = stored ? JSON.parse(stored) : { examProgress: {}, examHistory: [] };
      
      userData.examProgress = userData.examProgress || {};
      userData.examProgress[examId] = progress;
      
      localStorage.setItem(userDataKey, JSON.stringify(userData));
    } catch (error) {
      console.error('Error updating exam progress:', error);
    }
  };

  const addExamToHistory = async (results: any) => {
    try {
      const session = await AuthService.getSession();
      const userId = session?.user?.id || 'anonymous';
      const userDataKey = `userData_${userId}`;
      
      const stored = localStorage.getItem(userDataKey);
      const userData = stored ? JSON.parse(stored) : { examProgress: {}, examHistory: [] };
      
      userData.examHistory = userData.examHistory || [];
      userData.examHistory.push(results);
      
      localStorage.setItem(userDataKey, JSON.stringify(userData));
    } catch (error) {
      console.error('Error adding exam to history:', error);
    }
  };
  
  // Load configuration from sessionStorage
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(20);
  
  useEffect(() => {
    const configStr = sessionStorage.getItem(`exam-config-${examId}`);
    
    if (!configStr) {
      router.push(`/exam/${examId}/setup`);
      return;
    }
    
    try {
      const examConfig: ExamConfig = JSON.parse(configStr);
      setConfig(examConfig);
      setQuestionCount(examConfig.questionCount);
    } catch (error) {
      console.error('Error parsing exam config:', error);
      router.push(`/exam/${examId}/setup`);
    }
  }, [examId, router]);

  const { exam, questions, loading: isLoading, error } = useExamData(examId, questionCount, config?.selectedTopics);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | number[]>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showPauseModal, setShowPauseModal] = useState(false);

  // Initialize timer when config is loaded
  useEffect(() => {
    if (config && timeRemaining === 0) {
      setTimeRemaining(config.timeLimit * 60); // Convert minutes to seconds
    }
  }, [config]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Redirect if there's an error loading exam data
  useEffect(() => {
    if (error) {
      console.error('Failed to load exam:', error);
      router.push('/');
    }
  }, [error, router]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    
    setUserAnswers(prev => {
      if (currentQuestion.type === 'multiple') {
        // Handle multiple selection
        const currentAnswers = prev[currentQuestionIndex] as number[] || [];
        const isSelected = currentAnswers.includes(answerIndex);
        
        if (isSelected) {
          // Remove from selection
          const newAnswers = currentAnswers.filter(idx => idx !== answerIndex);
          return {
            ...prev,
            [currentQuestionIndex]: newAnswers.length > 0 ? newAnswers : []
          };
        } else {
          // Add to selection
          return {
            ...prev,
            [currentQuestionIndex]: [...currentAnswers, answerIndex]
          };
        }
      } else {
        // Handle single selection
        return {
          ...prev,
          [currentQuestionIndex]: answerIndex
        };
      }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  };

  const handleCheckAnswer = () => {
    setShowExplanation(true);
    setCheckedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: true
    }));
  };

  const handlePauseTest = () => {
    setShowPauseModal(true);
  };

  const handleConfirmPause = () => {
    // Save current progress
    const currentProgress = {
      currentQuestionIndex,
      userAnswers,
      checkedAnswers,
      timeRemaining
    };
    
    sessionStorage.setItem(`exam-progress-${examId}`, JSON.stringify(currentProgress));
    
    // Navigate back to dashboard
    router.push('/dashboard');
  };

  const getQuestionStatus = (questionIndex: number) => {
    const hasAnswer = userAnswers.hasOwnProperty(questionIndex);
    const isChecked = checkedAnswers[questionIndex];
    
    if (!hasAnswer) return 'unanswered';
    if (!isChecked) return 'answered';
    
    const userAnswer = userAnswers[questionIndex];
    const question = questions[questionIndex];
    const correctAnswers = Array.isArray(question.correct) ? question.correct : [question.correct];
    
    let isCorrect = false;
    if (question.type === 'multiple') {
      const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
      // Check if user selected exactly the correct answers
      isCorrect = userAnswerArray.length === correctAnswers.length &&
                  userAnswerArray.every(ans => correctAnswers.includes(ans));
    } else {
      isCorrect = userAnswer === question.correct;
    }
    
    return isCorrect ? 'correct' : 'incorrect';
  };

  const handleFinishExam = () => {
    // Calculate score
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      const correctAnswer = question.correct;
      
      if (question.type === 'multiple') {
        const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
        const correctAnswersArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        
        // Check if user selected exactly the correct answers
        if (userAnswerArray.length === correctAnswersArray.length &&
            userAnswerArray.every(ans => correctAnswersArray.includes(ans))) {
          correctAnswers++;
        }
      } else {
        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 100);
    
    // Store results
    const results = {
      examId,
      score,
      correctAnswers,
      totalQuestions: questions.length,
      timeSpent: config ? (config.timeLimit * 60 - timeRemaining) : 0,
      answers: userAnswers,
      completedAt: new Date().toISOString(),
      title: exam?.title || ''
    };
    
    sessionStorage.setItem(`exam-results-${examId}`, JSON.stringify(results));
    
    // Update exam progress to completed (100%)
    const completedProgress = {
      status: 'completed',
      progress: 100,
      score: score,
      correctAnswers: correctAnswers,
      totalQuestions: questions.length,
      completedAt: new Date().toISOString(),
      examId: examId,
      examTitle: exam?.title || ''
    };
    
    updateExamProgress(examId, completedProgress);
    
    // Add to exam history
    addExamToHistory(results);
    
    // Clear sessionStorage for this exam
    sessionStorage.removeItem(`exam-progress-${examId}`);
    sessionStorage.removeItem(`exam-config-${examId}`);
    
    // Navigate to results page (you can create this later)
    alert(`Exam completed! Score: ${score}% (${correctAnswers}/${questions.length})`);
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-white">Loading exam...</div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
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
                  <p><strong>Config Loaded:</strong> {config ? 'Yes' : 'No'}</p>
                  <p><strong>Selected Topics:</strong> {config?.selectedTopics?.join(', ') || 'None'}</p>
                  <p><strong>Question Count:</strong> {questionCount}</p>
                  <p><strong>Exam Data:</strong> {exam ? 'Loaded' : 'Not Loaded'}</p>
                  <p><strong>Questions Array:</strong> {questions?.length || 0} questions</p>
                  <p><strong>Error:</strong> {error || 'None'}</p>
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

  const currentQuestion = questions[currentQuestionIndex];
  const userAnswer = userAnswers[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{exam.title}</h1>
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
                  {exam?.topics.find(t => t.id === currentQuestion.topic)?.name || currentQuestion.topic}
                </span>
                {currentQuestion.difficulty && (
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
                  </span>
                )}
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {currentQuestion.question}
              </h2>

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
                  const correctAnswers = Array.isArray(currentQuestion.correct) 
                    ? currentQuestion.correct 
                    : [currentQuestion.correct];
                  
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
                        setCurrentQuestionIndex(index);
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
