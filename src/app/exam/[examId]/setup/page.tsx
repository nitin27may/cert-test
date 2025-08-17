'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { useExamData } from '@/hooks/useExamData';
import { examService } from '@/lib/api/examService';
import { CertificationInfo } from '@/lib/types';
import Link from 'next/link';

// Helper function to update exam progress in localStorage
const updateExamProgress = (examId: string, progressData: any) => {
  try {
    const key = `examProgress_${examId}`;
    const existingData = localStorage.getItem(key);
    const currentData = existingData ? JSON.parse(existingData) : {};
    
    const updatedData = {
      ...currentData,
      ...progressData,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(updatedData));
  } catch (error) {
    console.error('Error updating exam progress:', error);
  }
};

export default function ExamSetupPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  
  const { exam, loading: isLoading, error } = useExamData(examId);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(50);
  const [timeLimit, setTimeLimit] = useState(90);
  const [difficulty, setDifficulty] = useState<string>('mix');
  const [certificationInfo, setCertificationInfo] = useState<CertificationInfo | null>(null);

  useEffect(() => {
    if (exam) {
      // Select all topics by default - use topic IDs for consistency with question.topic
      setSelectedTopics(exam.topics.map(topic => topic.id));
    } else if (error) {
      router.push('/');
    }
  }, [exam, error, router]);

  useEffect(() => {
    const loadCertificationInfo = async () => {
      try {
        const examData = await examService.getExamById(examId);
        
        if (examData && examData.certificationInfo) {
          setCertificationInfo(examData.certificationInfo);
        }
      } catch (err) {
        console.error('Error loading certification info:', err);
      }
    };

    loadCertificationInfo();
  }, [examId]);

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId)
        ? prev.filter(t => t !== topicId)
        : [...prev, topicId]
    );
  };

  const handleStartExam = () => {
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    // Store configuration in sessionStorage for the practice page
    const config = {
      selectedTopics,
      questionCount,
      timeLimit,
      difficulty
    };
    
    sessionStorage.setItem(`exam-config-${examId}`, JSON.stringify(config));
    
    // Initialize exam progress in localStorage
    const initialProgress = {
      currentQuestionIndex: 0,
      userAnswers: {},
      checkedAnswers: {},
      startedAt: Date.now(),
      examId: examId,
      examTitle: certificationInfo?.title || exam?.title || ''
    };
    
    localStorage.setItem(`exam-progress-${examId}`, JSON.stringify(initialProgress));
    
    // Navigate to practice page
    router.push(`/exam/${examId}/practice`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading exam...</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Exam not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back to Exams
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {certificationInfo?.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {certificationInfo?.description || exam.description}
                </p>
                {certificationInfo && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                      {certificationInfo.examCode}
                    </span>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                      {certificationInfo.level}
                    </span>
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                      {certificationInfo.validity}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => router.push(`/exam/${examId}/certification-info`)}
                className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-3 rounded-full transition-colors group"
                title="View Certification Information & Exam Structure"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Info Button */}
          <div className="flex justify-end mb-6">
            <Link
              href={`/exam/${examId}/certification-info`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Certification Info
            </Link>
          </div>

          {/* Info Button Explanation */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Certification Information</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Click the info button (ℹ️) in the top right to view detailed certification information, exam structure, weightage, study resources, and career paths.
                  {certificationInfo ? (
                    <span className="block mt-1 text-green-600 dark:text-green-400">
                      <strong>✓</strong> Using certification info for title, description, and exam details.
                    </span>
                  ) : (
                    <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                      <strong>Note:</strong> Certification details will be displayed once you add the certificationInfo object to your exams.json file. This will also improve the exam title and description display.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Exam Structure & Weightage */}
          {/* Removed from default view - now only shown in dedicated page */}

          {/* Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Topics Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Topics</h3>
              <div className="space-y-3">
                {exam.topics.map((topic) => (
                  <label key={topic.id} className="flex items-start p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(topic.id)}
                      onChange={() => handleTopicToggle(topic.id)}
                      className="mt-1 mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900 dark:text-white">{topic.name}</div>
                        {topic.weightage && (
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                            {topic.weightage}%
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {topic.modules.join(', ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              {/* Topics Summary */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Topics Coverage</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Selected Topics:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedTopics.length} of {exam.topics.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Weightage:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedTopics.reduce((total, topicId) => {
                        const topic = exam.topics.find(t => t.id === topicId);
                        return total + (topic?.weightage || 0);
                      }, 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(selectedTopics.reduce((total, topicId) => {
                          const topic = exam.topics.find(t => t.id === topicId);
                          return total + (topic?.weightage || 0);
                        }, 0) / 100) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedTopics.length === 0 
                      ? 'Select topics to see coverage percentage'
                      : selectedTopics.length === exam.topics.length 
                        ? 'Full exam coverage selected'
                        : 'Partial exam coverage selected'
                    }
                  </p>
                  {!certificationInfo && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        <strong>Note:</strong> Weightage percentages will be more accurate once you add certificationInfo to your exams.json file.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Exam Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exam Settings</h3>
              
              <div className="space-y-6">
                {/* Question Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                  >
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={50}>50 Questions</option>
                    <option value={80}>80 Questions</option>
                    <option value={100}>100 Questions</option>
                    <option value={exam.totalQuestions}>All Questions ({exam.totalQuestions})</option>
                  </select>
                </div>

                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Limit (minutes)
                  </label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>

                {/* Difficulty Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                  >
                    <option value="mix">Mix (All Levels)</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="difficult">Difficult</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Choose specific difficulty or mix all levels for comprehensive practice
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Summary</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Topics: {selectedTopics.length} of {exam.topics.length}</li>
                    <li>Questions: {questionCount}</li>
                    <li>Time: {timeLimit} minutes</li>
                    <li>Difficulty: {difficulty === 'mix' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleStartExam}
              disabled={selectedTopics.length === 0}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Start {certificationInfo?.examCode || 'Practice'} Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
