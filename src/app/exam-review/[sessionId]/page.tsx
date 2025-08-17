'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';

interface Question {
  id: number;
  order: number;
  question_text: string;
  options: string[];
  correct_answers: number[];
  explanation: string | null;
  reasoning: any;
  topic_id: string;
  topic_name: string;
  module: string | null;
  category: string | null;
  type: 'single' | 'multiple' | 'case-study';
  difficulty: 'easy' | 'medium' | 'difficult';
  user_answer: number[] | null;
  is_correct: boolean | null;
  time_spent: number;
  answered_at: string | null;
}

interface SessionSummary {
  total_questions: number;
  questions_answered: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  accuracy: number;
  time_spent_minutes: number;
  average_time_per_question: number;
}

interface SessionDetails {
  session: {
    id: string;
    exam_id: string;
    exam_title: string;
    session_name: string;
    status: string;
    total_questions: number;
    questions_answered: number;
    correct_answers: number;
    score: number;
    time_spent_seconds: number;
    start_time: string;
    end_time: string;
    last_activity: string;
  };
  questions: Question[];
  summary: SessionSummary;
}

export default function ExamReviewPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExplanations, setShowExplanations] = useState(true);

  useEffect(() => {
    if (!user?.id || !sessionId) return;

    const loadSessionDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/results/${sessionId}?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to load session details');
        }

        const data = await response.json();
        setSessionDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionDetails();
  }, [user?.id, sessionId]);

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading exam review...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !sessionDetails) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Failed to Load Exam Review
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || 'Unable to load session details'}
              </p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const currentQuestion = sessionDetails.questions[currentQuestionIndex];
  const { session, summary } = sessionDetails;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'difficult': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isAnswerCorrect = (question: Question) => {
    if (question.user_answer === null) return false;
    if (question.type === 'single') {
      return question.user_answer.length === 1 && 
             question.correct_answers.length === 1 && 
             question.user_answer[0] === question.correct_answers[0];
    }
    // For multiple choice, check if arrays match
    return question.user_answer.length === question.correct_answers.length &&
           question.user_answer.sort().every((val, idx) => val === question.correct_answers.sort()[idx]);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
                        {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Exam Review: {sessionDetails.session.exam_title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Session: {sessionDetails.session.session_name} • {new Date(sessionDetails.session.end_time).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-3 flex-row-reverse">
                <button
                  onClick={() => setShowExplanations(!showExplanations)}
                  className="px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium"
                >
                  {showExplanations ? 'Hide' : 'Show'} Explanations
                </button>
                <button
                  onClick={() => router.back()}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ← Back
                </button>
              </div>
            </div>

            {/* Summary Cards - Enhanced Design Flow */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 sm:p-6 border border-blue-200 dark:border-blue-700/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.accuracy.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium">Accuracy</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 sm:p-6 border border-green-200 dark:border-green-700/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                  {summary.correct_answers}/{summary.total_questions}
                </div>
                <div className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium">Correct Answers</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 sm:p-6 border border-purple-200 dark:border-purple-700/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {summary.time_spent_minutes}m
                </div>
                <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium">Time Spent</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 sm:p-6 border border-orange-200 dark:border-orange-700/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {summary.average_time_per_question}s
                </div>
                <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 font-medium">Avg Time/Question</div>
              </div>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Question {currentQuestionIndex + 1} of {sessionDetails.questions.length}
                </h2>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-600 dark:text-gray-400">Correct</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-gray-600 dark:text-gray-400">Incorrect</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
                  </div>
                </div>
              </div>

              {/* Responsive Question Grid - Fixed alignment and spacing */}
              <div className="grid gap-2 justify-items-center" style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${
                  sessionDetails.questions.length <= 20 ? '2.5rem' :
                  sessionDetails.questions.length <= 50 ? '2.25rem' :
                  sessionDetails.questions.length <= 100 ? '2rem' :
                  '1.75rem'
                }, 1fr))`,
                maxWidth: '100%'
              }}>
                {sessionDetails.questions.map((question, index) => {
                  const isAnswered = question.user_answer !== null;
                  const isCorrect = question.is_correct;
                  const isCurrent = index === currentQuestionIndex;
                  
                  let bgColor = 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300';
                  let hoverColor = 'hover:bg-gray-400 dark:hover:bg-gray-500';
                  
                  if (isAnswered) {
                    if (isCorrect) {
                      bgColor = 'bg-green-500 text-white';
                      hoverColor = 'hover:bg-green-600';
                    } else {
                      bgColor = 'bg-red-500 text-white';
                      hoverColor = 'hover:bg-red-600';
                    }
                  }
                  
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`
                        w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 transform
                        ${bgColor} ${hoverColor}
                        ${isCurrent 
                          ? 'ring-3 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 scale-110 shadow-lg' 
                          : 'hover:scale-105 shadow-md'
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        flex items-center justify-center
                      `}
                      title={`Question ${index + 1}: ${
                        isAnswered 
                          ? (isCorrect ? 'Correct' : 'Incorrect') 
                          : 'Unanswered'
                      } ${isCurrent ? '(Current)' : ''}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Quick Stats Row - Fixed spacing and alignment */}
              <div className="flex justify-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {summary.correct_answers} Correct
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {summary.incorrect_answers} Incorrect
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      {summary.unanswered_questions} Unanswered
                    </span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">•</div>
                  <div className="font-medium text-blue-600 dark:text-blue-400">
                    {summary.accuracy.toFixed(1)}% Accuracy
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Display - Enhanced Design Flow */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 hover:shadow-md transition-all duration-200">
            <div className="p-6 sm:p-8">
              {/* Question Header - Enhanced Visual Flow */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(currentQuestion.difficulty)}`}>
                    {currentQuestion.difficulty.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                    {currentQuestion.type.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded-full text-xs font-semibold">
                    {currentQuestion.topic_name}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Time: {formatTime(currentQuestion.time_spent)}
                </div>
              </div>

              {/* Question Text - Enhanced Typography */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 leading-relaxed">
                  {currentQuestion.question_text}
                </h3>
                
                {/* Options - Enhanced Visual Flow */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isUserAnswer = currentQuestion.user_answer?.includes(index);
                    const isCorrectAnswer = currentQuestion.correct_answers.includes(index);
                    const isWrongAnswer = isUserAnswer && !isCorrectAnswer;
                    
                    let optionClasses = 'p-4 border rounded-lg transition-all duration-200 hover:shadow-sm';
                    if (isCorrectAnswer) {
                      optionClasses += ' bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700';
                    } else if (isWrongAnswer) {
                      optionClasses += ' bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
                    } else {
                      optionClasses += ' bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
                    }

                    return (
                      <div key={index} className={optionClasses}>
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center mr-3 mt-0.5">
                            {isCorrectAnswer && (
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            )}
                            {isWrongAnswer && (
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            )}
                          </div>
                          <span className={`text-sm leading-relaxed ${
                            isCorrectAnswer ? 'text-green-800 dark:text-green-200' :
                            isWrongAnswer ? 'text-red-800 dark:text-red-200' :
                            'text-gray-700 dark:text-gray-300'
                          }`}>
                            {String.fromCharCode(65 + index)}. {option}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Answer Summary - Enhanced Visual Flow */}
              <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-base">Your Answer</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    currentQuestion.is_correct 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                  }`}>
                    {currentQuestion.is_correct ? (
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    {currentQuestion.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                
                {currentQuestion.user_answer ? (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Selected:</span> {' '}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {currentQuestion.user_answer.map(i => String.fromCharCode(65 + i)).join(', ')}
                    </span>
                    {currentQuestion.type === 'multiple' && currentQuestion.user_answer.length > 1 && (
                      <span className="text-blue-600 dark:text-blue-400 ml-2 text-xs">(Multiple Selection)</span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">No answer provided</div>
                )}
              </div>

              {/* Explanation */}
              {showExplanations && currentQuestion.explanation && (
                <div className="mb-6 p-4 sm:p-5 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Explanation</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              )}

              {/* Navigation Buttons - Enhanced Fluid Layout */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-0">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous Question
                </button>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {currentQuestionIndex + 1} of {sessionDetails.questions.length}
                    </span>
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${((currentQuestionIndex + 1) / sessionDetails.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {Math.round(((currentQuestionIndex + 1) / sessionDetails.questions.length) * 100)}% Complete
                  </div>
                </div>
                
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(sessionDetails.questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === sessionDetails.questions.length - 1}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                >
                  Next Question
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
