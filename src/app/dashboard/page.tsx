'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { AuthGuard } from '../../components/AuthGuard';
import { useAuth } from '../../contexts/AuthContext';
import { useAvailableExams } from '../../hooks/useExamData';
import { AuthService } from '../../lib/auth/authService';

interface ActiveExam {
  examId: string;
  title: string;
  progress: number;
  lastActivity: string;
  questionsAnswered: number;
  totalQuestions: number;
  score?: number;
}

interface ExamStats {
  totalExams: number;
  completedExams: number;
  inProgressExams: number;
  averageScore: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activeExams, setActiveExams] = useState<Record<string, ActiveExam>>({});
  const [examStats, setExamStats] = useState<ExamStats>({
    totalExams: 0,
    completedExams: 0,
    inProgressExams: 0,
    averageScore: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const { exams, loading: isLoading, error } = useAvailableExams();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);

  useEffect(() => {
    // Get Supabase user session
    const loadSupabaseUser = async () => {
      try {
        const session = await AuthService.getSession();
        if (session?.user) {
          setSupabaseUser(session.user);
        }
      } catch (error) {
        console.error('Error loading Supabase user:', error);
      }
    };
    
    loadSupabaseUser();
  }, []);

  useEffect(() => {
    if (!user && !supabaseUser) return;
    
    // For now, we'll use localStorage to maintain exam progress
    // In the future, this could be moved to Supabase database
    const getStoredUserData = () => {
      try {
        const stored = localStorage.getItem(`userData_${supabaseUser?.id || user?.id || 'anonymous'}`);
        return stored ? JSON.parse(stored) : { examProgress: {}, examHistory: [] };
      } catch (error) {
        console.error('Error loading user data:', error);
        return { examProgress: {}, examHistory: [] };
      }
    };

    const userData = getStoredUserData();
    
    if (userData) {
      setActiveExams(userData.examProgress || {});
      
      // Calculate stats from user data
      const progressValues = Object.values(userData.examProgress || {});
      const completedCount = progressValues.filter((exam: any) => exam.progress === 100).length;
      const inProgressCount = progressValues.filter((exam: any) => exam.progress > 0 && exam.progress < 100).length;
      
      const completedExams = progressValues.filter((exam: any) => exam.progress === 100);
      const avgScore = completedExams.length > 0 
        ? completedExams.reduce((sum: number, exam: any) => sum + (exam.score || 0), 0) / completedExams.length 
        : 0;

      setExamStats({
        totalExams: completedCount + inProgressCount,
        completedExams: completedCount,
        inProgressExams: inProgressCount,
        averageScore: Math.round(avgScore),
      });

      // Generate recent activity from exam history and in-progress exams
      const completedActivities = userData.examHistory?.slice(0, 3).map((exam: any) => ({
        type: 'completed',
        title: exam.title || `Exam ${exam.examId}`,
        date: exam.completedAt,
        progress: 100,
      })) || [];
      
      const inProgressActivities = progressValues
        .filter((exam: any) => exam.progress > 0 && exam.progress < 100)
        .slice(0, 2)
        .map((exam: any) => ({
          type: 'in-progress',
          title: exam.examTitle || `Exam ${exam.examId}`,
          date: exam.lastUpdated || exam.startedAt,
          progress: exam.progress,
        }));

      const allActivities = [...inProgressActivities, ...completedActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentActivity(allActivities);
    }
  }, [user, supabaseUser, exams]);

  const resumeExam = (examId: string) => {
    window.location.href = `/exam/${examId}/practice`;
  };

  const resetExam = (examId: string) => {
    if (confirm('Are you sure you want to reset this exam? All progress will be lost.')) {
      // Update localStorage for exam progress
      try {
        const userId = supabaseUser?.id || user?.id || 'anonymous';
        const stored = localStorage.getItem(`userData_${userId}`);
        const userData = stored ? JSON.parse(stored) : { examProgress: {}, examHistory: [] };
        
        const updatedProgress = { ...userData.examProgress };
        delete updatedProgress[examId];
        
        const updatedUserData = { ...userData, examProgress: updatedProgress };
        localStorage.setItem(`userData_${userId}`, JSON.stringify(updatedUserData));
        
        setActiveExams(updatedProgress);
      } catch (error) {
        console.error('Error resetting exam progress:', error);
      }
    }
  };

  return (
    <AuthGuard requireAuth={true}>
      {isLoading ? (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading exam data...</p>
              <p className="text-sm text-gray-500 mt-2">Fetching available exams...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Header />
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back{supabaseUser?.email ? `, ${supabaseUser.email}` : ''}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Track your progress and continue your Azure certification journey.</p>
            {supabaseUser && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <div className="text-green-500 mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      Account verified and ready to go!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Exams</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{examStats.totalExams}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{examStats.completedExams}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{examStats.inProgressExams}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{examStats.averageScore}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Exams */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Active Practice Sessions</h2>
                    <Link
                      href="/exams"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      View All Tests
                    </Link>
                  </div>
                </div>
                
                <div className="p-6">
                  {Object.keys(activeExams).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No active sessions</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">Start practicing with our Azure certification exams.</p>
                      <Link
                        href="/exams"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Start New Practice
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.values(activeExams).map((activeExam) => (
                        <div key={activeExam.examId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{activeExam.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {activeExam.questionsAnswered} of {activeExam.totalQuestions} questions answered
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => resumeExam(activeExam.examId)}
                                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                              >
                                Resume
                              </button>
                              <button
                                onClick={() => resetExam(activeExam.examId)}
                                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                  style={{ width: `${activeExam.progress}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {activeExam.progress}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href="/exams"
                    className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Start New Practice</span>
                  </Link>
                  
                  <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">View Progress</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start">
                        <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                          activity.type === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.type === 'completed' ? 'Completed' : `${activity.progress}% progress`} • {new Date(activity.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">💡 Study Tip</h3>
                <p className="text-sm opacity-90">
                  Focus on networking topics for AZ-104 and AZ-305 exams. They make up a significant portion of the questions!
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
      )}
    </AuthGuard>
  );
}