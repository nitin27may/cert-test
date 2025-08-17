'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { useExamData } from '@/hooks/useExamData';
import { examService } from '@/lib/api/examService';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { ParsedCertificationInfo } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export default function ExamSetupPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user } = useAuth();
  
  const { exam, loading: isLoading, error } = useExamData(examId);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(50);
  const [timeLimit, setState] = useState(90);
  const [difficulty, setDifficulty] = useState<string>('mix');
  const [certificationInfo, setCertificationInfo] = useState<ParsedCertificationInfo | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCertificationDropdownOpen, setIsCertificationDropdownOpen] = useState(false);

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
        
        if (examData && examData.certification_info) {
          setCertificationInfo(examData.certification_info);
        }
      } catch (err) {
        console.error('Error loading certification info:', err);
      }
    };

    loadCertificationInfo();
  }, [examId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isCertificationDropdownOpen && !target.closest('.certification-dropdown')) {
        setIsCertificationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCertificationDropdownOpen]);

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId)
        ? prev.filter(t => t !== topicId)
        : [...prev, topicId]
    );
  };

  const handleStartExam = async () => {
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    if (!user?.id) {
      alert('Please log in to start an exam');
      return;
    }

    setIsStarting(true);

    try {
      // Use the new API route instead of direct Supabase call
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          examId: examId,
          selectedTopics: selectedTopics,
          questionLimit: questionCount,
          sessionName: `Practice Session - ${new Date().toLocaleDateString()}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const sessionResponse = await response.json();
      console.log('Session created successfully:', sessionResponse.session.id);
      
      // Navigate to practice page with session ID to avoid race condition
      router.push(`/exam/${examId}/practice?sessionId=${sessionResponse.session.id}`);
      
    } catch (error) {
      console.error('Failed to create session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start exam: ${errorMessage}`);
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-white">Loading exam...</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-white">Exam not found</div>
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
                  {certificationInfo?.title || exam.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {certificationInfo?.description || exam.description}
                </p>
                {certificationInfo && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                      {certificationInfo.exam_code}
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
              <div className="relative">
                <button
                  onClick={() => setIsCertificationDropdownOpen(!isCertificationDropdownOpen)}
                  className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-3 rounded-full transition-colors group"
                  title="View Certification Information & Exam Structure"
                >
                  <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>

                {/* Dropdown */}
                {isCertificationDropdownOpen && (
                  <div className="certification-dropdown absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Certification Overview</h4>
                    </div>
                    
                    {certificationInfo ? (
                      <>
                        {/* Quick Info */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Exam Code:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{certificationInfo.exam_code}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Level:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{certificationInfo.level}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Validity:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{certificationInfo.validity}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Duration:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{certificationInfo.exam_details?.duration}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Questions:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{certificationInfo.exam_details?.questions}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Passing Score:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{certificationInfo.exam_details?.passingScore}</span>
                          </div>
                        </div>

                        {/* Skills Measured Preview */}
                        {certificationInfo.skills_measured && certificationInfo.skills_measured.length > 0 && (
                          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Key Skills:</h5>
                            <div className="space-y-1">
                              {certificationInfo.skills_measured.slice(0, 3).map((skill, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 dark:text-gray-300">{skill.category}</span>
                                  <span className="text-gray-500 dark:text-gray-400">{skill.weightage}%</span>
                                </div>
                              ))}
                              {certificationInfo.skills_measured.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                                  +{certificationInfo.skills_measured.length - 3} more skills
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          <div className="text-yellow-500 dark:text-yellow-400 mb-2">⚠️</div>
                          <p>Certification details not available</p>
                          <p className="text-xs mt-1">Add via admin API or Supabase</p>
                        </div>
                      </div>
                    )}

                    {/* View Full Details Link */}
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setIsCertificationDropdownOpen(false);
                          router.push(`/exam/${examId}/certification-info`);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                          </svg>
                          View Full Details
                        </div>
                      </button>
                    </div>
                  </div>
                )}
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
                        {((topic.weightage || (topic.weight ? parseFloat(topic.weight) : 0)) > 0) && (
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                            {(topic.weightage || (topic.weight ? parseFloat(topic.weight) : 0))}%
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {Array.isArray(topic.modules) 
                          ? topic.modules.map(module => 
                              typeof module === 'string' 
                                ? module 
                                : module.module_name || 'Unknown Module'
                            ).join(', ')
                          : 'No modules available'
                        }
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
                        // Handle both weight (string) and weightage (number) properties
                        const topicWeightage = topic?.weightage || (topic?.weight ? parseFloat(topic.weight) : 0);
                        return total + (topicWeightage || 0);
                      }, 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(selectedTopics.reduce((total, topicId) => {
                          const topic = exam.topics.find(t => t.id === topicId);
                          // Handle both weight (string) and weightage (number) properties
                          const topicWeightage = topic?.weightage || (topic?.weight ? parseFloat(topic.weight) : 0);
                          return total + (topicWeightage || 0);
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
                        <strong>Note:</strong> Weightage percentages improve when certification info exists in Supabase. Add via admin API or SQL (see SETUP-GUIDE.md).
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
                    <option value={exam.total_questions}>All Questions ({exam.total_questions})</option>
                  </select>
                </div>

                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Limit (minutes)
                  </label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setState(Number(e.target.value))}
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
              disabled={selectedTopics.length === 0 || isStarting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              {isStarting ? 'Starting Exam...' : `Start ${certificationInfo?.exam_code || 'Practice'} Exam`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
