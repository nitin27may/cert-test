'use client';

import { useAvailableExams } from '../../hooks/useExamData';

export default function TestDashboard() {
  const { exams, loading: isLoading, error } = useAvailableExams();

  console.log('TestDashboard - isLoading:', isLoading, 'exams:', exams?.length, 'error:', error);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading exam data...</p>
            <p className="text-sm text-gray-500 mt-2">Fetching available exams...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Test Dashboard (No Auth)</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Available Exams ({exams.length})</h2>
          <div className="grid gap-4">
            {exams.map((exam) => (
              <div key={exam.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-lg">{exam.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{exam.description}</p>
                <p className="text-sm mt-2">
                  <span className="font-medium">Questions:</span> {exam.totalQuestions}
                  {exam.networkingFocusPercentage && (
                    <span className="ml-4">
                      <span className="font-medium">Networking Focus:</span> {exam.networkingFocusPercentage}%
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500">
          This is a test page that bypasses authentication to test exam data loading only.
        </p>
      </div>
    </div>
  );
}
