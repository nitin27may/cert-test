'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAvailableExams } from '@/hooks/useExamData';
import { storage } from '@/lib/utils';
import { sessionManager, withAuth } from '@/lib/auth/session';

export default function ExamsPage() {
  const [activeExams, setActiveExams] = useState<Record<string, any>>({});
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { exams, loading: isLoading, error } = useAvailableExams();

  useEffect(() => {
    withAuth(() => {
      // Load active exams from user data through sessionManager
      const userData = sessionManager.getUserData();
      if (userData) {
        // Convert exam progress to the format expected by the UI
        const activeExamsData: Record<string, any> = {};
        Object.entries(userData.examProgress || {}).forEach(([examId, progress]: [string, any]) => {
          activeExamsData[examId] = {
            progress: progress.progress || 0,
            status: progress.status || 'not-started',
            lastActivity: progress.lastUpdated || progress.startedAt
          };
        });
        setActiveExams(activeExamsData);
      }
    });
  }, []);

  const getExamStatus = (examId: string) => {
    const activeExam = activeExams[examId];
    if (!activeExam) return 'not-started';
    if (activeExam.progress === 100) return 'completed';
    if (activeExam.progress > 0) return 'in-progress';
    return 'not-started';
  };

  const filteredExams = exams.filter(exam => {
    if (selectedFilter === 'all') return true;
    const status = getExamStatus(exam.id);
    return status === selectedFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Completed
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Not Started
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading exams...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Azure Practice Exams</h1>
          <p className="text-gray-600 dark:text-gray-300">Choose from our comprehensive collection of Azure certification practice tests.</p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedFilter === 'all'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                All Exams ({exams.length})
              </button>
              <button
                onClick={() => setSelectedFilter('not-started')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedFilter === 'not-started'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Not Started ({exams.filter(exam => getExamStatus(exam.id) === 'not-started').length})
              </button>
              <button
                onClick={() => setSelectedFilter('in-progress')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedFilter === 'in-progress'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                In Progress ({exams.filter(exam => getExamStatus(exam.id) === 'in-progress').length})
              </button>
              <button
                onClick={() => setSelectedFilter('completed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedFilter === 'completed'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Completed ({exams.filter(exam => getExamStatus(exam.id) === 'completed').length})
              </button>
            </nav>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Exams</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Exam Cards */}
        {!error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => {
              const status = getExamStatus(exam.id);
              const activeExam = activeExams[exam.id];
              
              return (
                <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {exam.id.replace('az-', '').toUpperCase()}
                        </span>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{exam.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{exam.description}</p>
                    
                    {/* Exam Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        {exam.totalQuestions} Questions
                      </div>
                      
                      {exam.networkingFocusPercentage && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path>
                          </svg>
                          {exam.networkingFocusPercentage}% Networking Focus
                        </div>
                      )}
                    </div>

                    {/* Progress Bar (for in-progress exams) */}
                    {status === 'in-progress' && activeExam && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <span>Progress</span>
                          <span>{activeExam.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${activeExam.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Last activity: {new Date(activeExam.lastActivity).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {/* Completed Exam Stats */}
                    {status === 'completed' && activeExam && (
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-900 dark:text-green-300">Score: {activeExam.score || 'N/A'}%</p>
                            <p className="text-xs text-green-700 dark:text-green-400">Completed on {new Date(activeExam.lastActivity).toLocaleDateString()}</p>
                          </div>
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="px-6 pb-6">
                    {status === 'not-started' && (
                      <Link
                        href={`/exam/${exam.id}/setup`}
                        className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Start Practice
                      </Link>
                    )}
                    
                    {status === 'in-progress' && (
                      <div className="flex space-x-2">
                        <Link
                          href={`/exam/${exam.id}/practice`}
                          className="flex-1 bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Continue
                        </Link>
                        <Link
                          href={`/exam/${exam.id}/setup`}
                          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                          </svg>
                        </Link>
                      </div>
                    )}
                    
                    {status === 'completed' && (
                      <div className="flex space-x-2">
                        <Link
                          href={`/exam/${exam.id}/setup`}
                          className="flex-1 bg-green-600 text-white text-center py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Practice Again
                        </Link>
                        <button className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!error && filteredExams.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exams found</h3>
            <p className="text-gray-600">Try adjusting your filter or check back later for new exams.</p>
          </div>
        )}
      </main>
    </div>
  );
}
