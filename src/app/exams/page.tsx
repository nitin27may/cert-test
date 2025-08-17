'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAvailableExams } from '@/hooks/useExamData';
import { useExamState } from '@/hooks/useExamState';
import Header from '@/components/Header';
import ConfirmationModal from '@/components/ConfirmationModal';
import { examService } from '@/lib/api/examService';
import { storage } from '@/lib/utils';
import { CertificationInfo } from '@/lib/types';

// Helper function to get all exam progress from localStorage
const getAllExamProgress = () => {
  const progress: Record<string, any> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('examProgress_')) {
        const examId = key.replace('examProgress_', '');
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsedData = JSON.parse(data);
            progress[examId] = parsedData;
          } catch (parseError) {
            console.warn(`Could not parse progress data for ${examId}:`, parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading exam progress:', error);
  }
  return progress;
};

export default function ExamsPage() {
  const [activeExams, setActiveExams] = useState<Record<string, any>>({});
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [certificationInfoMap, setCertificationInfoMap] = useState<Record<string, any>>({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [examToReset, setExamToReset] = useState<string | null>(null);
  const { exams, loading: isLoading, error } = useAvailableExams();

  useEffect(() => {
    // Load active exams from localStorage
    const examProgressData = getAllExamProgress();
    const activeExamsData: Record<string, any> = {};
    
    Object.entries(examProgressData).forEach(([examId, progress]: [string, any]) => {
      activeExamsData[examId] = {
        progress: progress.progress || 0,
        status: progress.status || 'not-started',
        lastActivity: progress.updatedAt || progress.startedAt
      };
    });
    setActiveExams(activeExamsData);
  }, []);

  // Load certification info for all exams
  useEffect(() => {
    const loadCertificationInfo = async () => {
      if (exams.length === 0) return;
      
      const certificationInfoData: Record<string, CertificationInfo> = {};
      
      for (const exam of exams) {
        try {
          const examData = await examService.getExamById(exam.id);
          if (examData && examData.certificationInfo) {
            certificationInfoData[exam.id] = examData.certificationInfo;
          }
        } catch (err) {
          console.error(`Error loading certification info for ${exam.id}:`, err);
        }
      }
      
      setCertificationInfoMap(certificationInfoData);
    };

    loadCertificationInfo();
  }, [exams]);

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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-green-300">
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

  const resetExam = (examId: string) => {
    setExamToReset(examId);
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    if (!examToReset) return;
    
    // Clear all exam-related data for this exam
    const examProgressKey = `examProgress_${examToReset}`;
    const userDataKey = `userData_${examToReset}`;
    const examConfigKey = `exam-config-${examToReset}`;
    const examProgressSessionKey = `exam-progress-${examToReset}`;
    
    // Clear localStorage
    localStorage.removeItem(examProgressKey);
    localStorage.removeItem(userDataKey);
    
    // Clear sessionStorage
    sessionStorage.removeItem(examConfigKey);
    sessionStorage.removeItem(examProgressSessionKey);
    
    // Update local state
    setActiveExams(prev => {
      const updated = { ...prev };
      delete updated[examToReset];
      return updated;
    });
    
    // Close modal
    setShowResetModal(false);
    setExamToReset(null);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Azure Practice Exams</h1>
              <p className="text-gray-600 dark:text-gray-400">Choose an exam to start practicing for your Azure certification.</p>
            </div>
            <div className="flex space-x-3">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
              >
                <option value="all">All Exams</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
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
                    
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {certificationInfoMap[exam.id]?.title || exam.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      {certificationInfoMap[exam.id]?.description || exam.description}
                    </p>
                    
                    {/* Certification Info Indicator */}
                    {certificationInfoMap[exam.id] && (
                      <div className="mb-4 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {certificationInfoMap[exam.id].examCode} - {certificationInfoMap[exam.id].level}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                          {certificationInfoMap[exam.id].validity}
                        </span>
                      </div>
                    )}
                    
                    {/* Loading indicator for certification info */}
                    {!certificationInfoMap[exam.id] && (
                      <div className="mb-4 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                          </svg>
                          Loading certification info...
                        </span>
                      </div>
                    )}

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
                        <button
                          onClick={() => resetExam(exam.id)}
                          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Reset exam progress"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                          </svg>
                        </button>
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
                        <button 
                          onClick={() => resetExam(exam.id)}
                          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Reset exam progress"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
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

      {/* Confirmation Modal */}
      {showResetModal && examToReset && (
        <ConfirmationModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          onConfirm={handleConfirmReset}
          title="Confirm Reset"
          message={`Are you sure you want to reset the progress for "${certificationInfoMap[examToReset]?.title || examToReset.replace('az-', '').toUpperCase()}"? This action cannot be undone.`}
          confirmText="Reset"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}