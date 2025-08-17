'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useExamResults } from '@/hooks/useExamResults';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { realtimeService } from '@/lib/services/realtimeService';
import Header from '@/components/Header';
import { AuthGuard } from '../../components/AuthGuard';
import { AuthService } from '../../lib/auth/authService';
import Link from 'next/link';

interface DashboardStats {
  totalExams: number;
  completedExams: number;
  inProgressExams: number;
  averageScore: number;
  lastExamDate: string | null;
  streakDays: number;
}

interface ActiveSession {
  id: string;
  examId: string;
  examTitle: string;
  progress: number;
  lastActivity: string;
  questionsAnswered: number;
  totalQuestions: number;
  status: string;
}

interface RecentResult {
  id: string;
  examId: string;
  examTitle: string;
  score: number;
  completedAt: string;
  timeSpent: number;
  improvement?: number;
}

export default function EnhancedDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalExams: 0,
    completedExams: 0,
    inProgressExams: 0,
    averageScore: 0,
    lastExamDate: null,
    streakDays: 0
  });
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

  // Get exam results analytics
  const [resultsState, resultsActions] = useExamResults(supabaseUser?.id || '');

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

  // Load dashboard data
  useEffect(() => {
    if (!supabaseUser?.id) return;

    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load available exams
        const examsResponse = await supabaseExamService.getExams();
        setAvailableExams(examsResponse.exams);

        // Load user sessions
        const sessionsResponse = await supabaseExamService.getUserSessions(supabaseUser.id);
        
        // Filter active sessions
        const activeSessionsData = sessionsResponse.sessions
          .filter(session => session.status === 'in_progress')
          .map(session => ({
            id: session.id,
            examId: session.exam_id,
            examTitle: session.exam_title,
            progress: session.progress,
            lastActivity: session.last_activity,
            questionsAnswered: session.questions_answered,
            totalQuestions: session.total_questions,
            status: session.status
          }));
        
        setActiveSessions(activeSessionsData);

        // Load recent results
        const resultsResponse = await supabaseExamService.getUserResults(supabaseUser.id);
        const recentResultsData = resultsResponse.results
          .slice(0, 5)
          .map((result, index) => ({
            id: result.id,
            examId: result.exam_id,
            examTitle: result.exam_title,
            score: result.score_percentage,
            completedAt: result.completed_at,
            timeSpent: result.time_spent_seconds,
            improvement: index > 0 ? result.score_percentage - resultsResponse.results[index].score_percentage : undefined
          }));
        
        setRecentResults(recentResultsData);

        // Calculate dashboard stats
        const stats: DashboardStats = {
          totalExams: sessionsResponse.sessions.length,
          completedExams: resultsResponse.results.length,
          inProgressExams: activeSessionsData.length,
          averageScore: resultsResponse.results.length > 0 
            ? resultsResponse.results.reduce((sum, r) => sum + r.score_percentage, 0) / resultsResponse.results.length 
            : 0,
          lastExamDate: resultsResponse.results.length > 0 ? resultsResponse.results[0].completed_at : null,
          streakDays: calculateStreakDays(resultsResponse.results.map(r => r.completed_at))
        };

        setDashboardStats(stats);

      } catch (error: any) {
        console.error('Error loading dashboard data:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [supabaseUser?.id]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!supabaseUser?.id) return;

    const setupRealtimeUpdates = async () => {
      // Monitor connection status
      const checkConnection = () => {
        const status = realtimeService.getConnectionStatus();
        setConnectionStatus(status === 'OPEN' ? 'online' : 'offline');
      };

      const connectionInterval = setInterval(checkConnection, 5000);

      // Subscribe to user results updates
      await realtimeService.subscribeToUserResults(
        supabaseUser.id,
        (result) => {
          setRecentResults(prev => [
            {
              id: result.id,
              examId: result.exam_id,
              examTitle: result.exam_id, // Would be fetched from exams
              score: result.score_percentage,
              completedAt: result.completed_at,
              timeSpent: result.time_spent_seconds
            },
            ...prev.slice(0, 4)
          ]);
        },
        (error) => {
          console.error('Real-time results error:', error);
        }
      );

      return () => {
        clearInterval(connectionInterval);
        realtimeService.unsubscribeAll();
      };
    };

    setupRealtimeUpdates();
  }, [supabaseUser?.id]);

  // Calculate streak days
  const calculateStreakDays = (completionDates: string[]): number => {
    if (completionDates.length === 0) return 0;
    
    const dates = completionDates
      .map(date => new Date(date).toDateString())
      .sort()
      .reverse();
    
    let streak = 1;
    let currentDate = new Date(dates[0]);
    
    for (let i = 1; i < dates.length; i++) {
      const nextDate = new Date(dates[i]);
      const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        streak++;
        currentDate = nextDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const handleStartExam = async (examId: string) => {
    try {
      router.push(`/exam/${examId}/setup`);
    } catch (error) {
      console.error('Error starting exam:', error);
    }
  };

  const handleResumeSession = (sessionId: string) => {
    router.push(`/exam/session/${sessionId}`);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImprovementIndicator = (improvement?: number) => {
    if (!improvement) return null;
    if (improvement > 0) {
      return <span className="text-green-600 text-sm">↗ +{improvement.toFixed(1)}%</span>;
    } else if (improvement < 0) {
      return <span className="text-red-600 text-sm">↘ {improvement.toFixed(1)}%</span>;
    }
    return <span className="text-gray-600 text-sm">→ 0%</span>;
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        {/* Connection Status */}
        <div className={`fixed top-16 right-4 z-50 px-3 py-1 rounded-full text-sm font-medium ${
          connectionStatus === 'online' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {connectionStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
        </div>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user?.name || supabaseUser?.email?.split('@')[0] || 'Student'}!
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Track your progress and continue your learning journey
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex space-x-3">
                <button 
                  onClick={() => resultsActions.refreshData()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  🔄 Refresh
                </button>
                <Link
                  href="/exams"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  📝 Browse Exams
                </Link>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="text-red-400">⚠️</div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">📊</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Exams</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardStats.totalExams}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">✅</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardStats.completedExams}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">📈</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                      <dd className={`text-lg font-medium ${getScoreColor(dashboardStats.averageScore)}`}>
                        {dashboardStats.averageScore.toFixed(1)}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🔥</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Study Streak</dt>
                      <dd className="text-lg font-medium text-gray-900">{dashboardStats.streakDays} days</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Sessions */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Active Sessions {activeSessions.length > 0 && `(${activeSessions.length})`}
                  </h3>
                  
                  {activeSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📝</div>
                      <p className="text-gray-500 mb-4">No active exam sessions</p>
                      <button
                        onClick={() => router.push('/exams')}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Start New Exam
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">{session.examTitle}</h4>
                              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                <span>{session.questionsAnswered}/{session.totalQuestions} questions</span>
                                <span>Last activity: {new Date(session.lastActivity).toLocaleDateString()}</span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="mt-2">
                                <div className="flex items-center">
                                  <div className="flex-1">
                                    <div className="h-2 bg-gray-200 rounded-full">
                                      <div 
                                        className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                                        style={{ width: `${session.progress}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <span className="ml-2 text-sm text-gray-900">{session.progress.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <button
                                onClick={() => handleResumeSession(session.id)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                              >
                                Resume
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Exams */}
              <div className="mt-8 bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Available Exams</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableExams.slice(0, 4).map((exam) => (
                      <div key={exam.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">{exam.title}</h4>
                        <p className="text-sm text-gray-500 mb-3">{exam.total_questions} questions</p>
                        <button
                          onClick={() => handleStartExam(exam.id)}
                          className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          Start Exam
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {availableExams.length > 4 && (
                    <div className="mt-4 text-center">
                      <Link
                        href="/exams"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View all {availableExams.length} exams →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Results & Analytics */}
            <div className="space-y-8">
              {/* Recent Results */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Results</h3>
                  
                  {recentResults.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No results yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentResults.map((result) => (
                        <div key={result.id} className="flex items-center justify-between py-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.examTitle}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(result.completedAt).toLocaleDateString()} • {formatTime(result.timeSpent)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${getScoreColor(result.score)}`}>
                              {result.score.toFixed(1)}%
                            </p>
                            {getImprovementIndicator(result.improvement)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {recentResults.length > 0 && (
                    <div className="mt-4">
                      <Link
                        href="/results"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View all results →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
                  
                  {resultsState.analytics.achievements.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Latest Achievement</h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{resultsState.analytics.achievements[0].icon}</span>
                          <div>
                            <p className="text-sm font-medium text-yellow-800">
                              {resultsState.analytics.achievements[0].title}
                            </p>
                            <p className="text-sm text-yellow-700">
                              {resultsState.analytics.achievements[0].description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultsState.analytics.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendation</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm font-medium text-blue-800">
                          {resultsState.analytics.recommendations[0].title}
                        </p>
                        <p className="text-sm text-blue-700">
                          {resultsState.analytics.recommendations[0].description}
                        </p>
                      </div>
                    </div>
                  )}

                  {resultsState.analytics.achievements.length === 0 && resultsState.analytics.recommendations.length === 0 && (
                    <p className="text-gray-500 text-sm">Complete more exams to see insights</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}