'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAvailableExams } from '@/hooks/useExamData';
import { storage, getStorageKeys } from '@/lib/utils';

export default function Home() {
  const [activeExams, setActiveExams] = useState<Record<string, any>>({});
  const { exams, loading: isLoading, error } = useAvailableExams();

  useEffect(() => {
    // Load active exams from localStorage
    const activeExamsData = storage.get('azure_exam_active_exams', {});
    setActiveExams(activeExamsData);
  }, []);

  const resumeExam = (examId: string) => {
    // Navigate to practice page
    window.location.href = `/exam/${examId}/practice`;
  };

  const resetExam = (examId: string) => {
    if (confirm('Are you sure you want to reset this exam? All progress will be lost.')) {
      const storageKeys = getStorageKeys(examId);
      storage.remove(storageKeys.examSession);
      
      // Remove from active exams
      const updatedActiveExams = { ...activeExams };
      delete updatedActiveExams[examId];
      setActiveExams(updatedActiveExams);
      storage.set('azure_exam_active_exams', updatedActiveExams);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading exams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Azure Practice Exams</h1>
            <p className="text-gray-600">Select your certification exam to practice</p>
          </div>

          {/* In Progress Tests */}
          {Object.keys(activeExams).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tests in Progress</h3>
              <div className="grid grid-cols-1 gap-4 mb-6">
                {Object.values(activeExams).map((activeExam: any) => (
                  <div key={activeExam.examId} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{activeExam.title}</h4>
                        <p className="text-sm text-gray-600">Progress: {activeExam.progress}%</p>
                        <p className="text-sm text-gray-500">Last activity: {new Date(activeExam.lastActivity).toLocaleDateString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => resumeExam(activeExam.examId)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                        >
                          Continue
                        </button>
                        <button
                          onClick={() => resetExam(activeExam.examId)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading exams...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-red-600">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Available Tests */}
          {!isLoading && !error && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Practice Exams</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <div key={exam.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="mb-4">
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">{exam.title}</h4>
                      <p className="text-gray-600 text-sm mb-4">{exam.description}</p>
                      <div className="text-sm text-gray-500">
                        <p>{exam.totalQuestions} questions available</p>
                      </div>
                    </div>
                    <Link
                      href={`/exam/${exam.id}/setup`}
                      className="block w-full bg-blue-500 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Start Practice
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
