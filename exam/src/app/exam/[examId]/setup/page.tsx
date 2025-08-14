'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExamData } from '@/hooks/useExamData';
import Header from '@/components/Header';
import { sessionManager } from '@/lib/auth/session';

export default function ExamSetupPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  
  const { exam, loading: isLoading, error } = useExamData(examId);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [timeLimit, setTimeLimit] = useState(60);
  const [difficulty, setDifficulty] = useState<string>('mix');

  useEffect(() => {
    if (exam) {
      // Select all topics by default - use topic IDs for consistency with question.topic
      setSelectedTopics(exam.topics.map(topic => topic.id));
    } else if (error) {
      router.push('/');
    }
  }, [exam, error, router]);

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
    
    // Initialize exam progress in sessionManager
    const initialProgress = {
      currentQuestionIndex: 0,
      userAnswers: {},
      checkedAnswers: {},
      timeRemaining: timeLimit * 60, // Convert minutes to seconds
      startedAt: Date.now(),
      status: 'in-progress',
      progress: 1, // 1% to show as started
      examId: examId,
      examTitle: exam?.title || '',
      config: config
    };
    
    sessionManager.updateExamProgress(examId, initialProgress);
    
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
      <div className="max-w-4xl mx-auto p-8">
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{exam.title}</h1>
            <p className="text-gray-600 dark:text-gray-300">{exam.description}</p>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Topics Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Topics</h3>
              <div className="space-y-3">
                {exam.topics.map((topic) => (
                  <label key={topic.id} className="flex items-start p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(topic.id)}
                      onChange={() => handleTopicToggle(topic.id)}
                      className="mt-1 mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{topic.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {topic.modules.join(', ')}
                      </div>
                    </div>
                  </label>
                ))}
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
              Start Practice Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
