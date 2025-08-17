'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseExamService } from '@/lib/services/supabaseService';
import Header from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';

interface ExamResult {
  id: string;
  exam_id: string;
  session_id: string;
  exam_title: string;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  score_percentage: number;
  pass_status: boolean | null;
  completed_at: string;
  time_spent_seconds: number;
  average_time_per_question: number;
}

export default function ResultsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadResults = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await supabaseExamService.getUserResults(user.id);
        setResults(response.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [user?.id]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPassStatusColor = (passStatus: boolean | null) => {
    if (passStatus === null) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    return passStatus 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading results...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Failed to Load Results
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Exam Results
              </h1>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
            
            {results.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  No Results Yet
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Complete your first exam to see your results here.
                </p>
                <button
                  onClick={() => router.push('/exams')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start Your First Exam
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    All Results ({results.length})
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result) => (
                    <div key={result.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {result.exam_title}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPassStatusColor(result.pass_status)}`}>
                              {result.pass_status === null ? 'Pending' : result.pass_status ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-500 dark:text-gray-400">Score</span>
                              <span className={`text-lg font-semibold ${getScoreColor(result.score_percentage)}`}>
                                {result.score_percentage.toFixed(1)}%
                              </span>
                            </div>
                            
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-500 dark:text-gray-400">Questions</span>
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {result.correct_answers}/{result.total_questions}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {result.incorrect_answers} incorrect, {result.unanswered_questions} skipped
                              </span>
                            </div>
                            
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-500 dark:text-gray-400">Time</span>
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatTime(result.time_spent_seconds)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ~{result.average_time_per_question.toFixed(1)}s per question
                              </span>
                            </div>
                            
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-500 dark:text-gray-400">Completed</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(result.completed_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center ml-6">
                          <button
                            onClick={() => router.push(`/exam-review/${result.session_id}`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                          >
                            Review Exam
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
