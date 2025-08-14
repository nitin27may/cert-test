'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExamData } from '@/hooks/useExamData';

export default function ExamSetupPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  
  const { exam, loading: isLoading, error } = useExamData(examId);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [timeLimit, setTimeLimit] = useState(60);

  useEffect(() => {
    if (exam) {
      // Select all topics by default
      setSelectedTopics(exam.topics.map(topic => topic.name));
    } else if (error) {
      router.push('/');
    }
  }, [exam, error, router]);

  const handleTopicToggle = (topicName: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicName)
        ? prev.filter(t => t !== topicName)
        : [...prev, topicName]
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
      timeLimit
    };
    sessionStorage.setItem(`exam-config-${examId}`, JSON.stringify(config));
    
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-blue-500 hover:text-blue-600 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back to Exams
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            <p className="text-gray-600">{exam.description}</p>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Topics Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Topics</h3>
              <div className="space-y-3">
                {exam.topics.map((topic) => (
                  <label key={topic.id} className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(topic.name)}
                      onChange={() => handleTopicToggle(topic.name)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{topic.name}</div>
                      <div className="text-sm text-gray-500">
                        {topic.modules.join(', ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Exam Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Settings</h3>
              
              <div className="space-y-6">
                {/* Question Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={exam.totalQuestions}>All Questions ({exam.totalQuestions})</option>
                  </select>
                </div>

                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Limit (minutes)
                  </label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>Topics: {selectedTopics.length} of {exam.topics.length}</li>
                    <li>Questions: {questionCount}</li>
                    <li>Time: {timeLimit} minutes</li>
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
              className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-lg font-medium"
            >
              Start Practice Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
