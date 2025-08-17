'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabaseExamService } from '@/lib/services/supabaseService';
import { 
  Search, 
  Bell, 
  Settings, 
  User, 
  LogOut, 
  TrendingUp, 
  Users,
  Clock,
  Target,
  Award,
  Calendar,
  MoreHorizontal,
  Eye,
  Download,
  Share2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock as ClockIcon,
  BookOpen,
  BarChart3,
  PlayCircle
} from 'lucide-react';

interface RecentResult {
  id: string;
  examId: string;
  examTitle: string;
  score: number;
  completedAt: string;
  timeSpent: number;
  sessionId: string;
  improvement?: number;
}

interface ActiveSession {
  id: string;
  examId: string;
  examTitle: string;
  progress: number;
  timeSpent: number;
  status: string;
}

interface DashboardStats {
  totalExams: number;
  completedExams: number;
  averageScore: number;
  totalStudyTime: number;
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalExams: 0,
    completedExams: 0,
    averageScore: 0,
    totalStudyTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [availableExams, setAvailableExams] = useState<any[]>([]);

  // Load real data from services
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        // Load available exams
        const examsResponse = await supabaseExamService.getExams();
        setAvailableExams(examsResponse.exams || []);

        // Load user results
        const resultsResponse = await supabaseExamService.getUserResults(user.id);
        const recentResultsData = (resultsResponse.results || [])
          .slice(0, 5)
          .map((result, index) => ({
            id: result.id,
            examId: result.exam_id,
            examTitle: result.exam_title,
            score: result.score_percentage,
            completedAt: result.completed_at,
            timeSpent: result.time_spent_seconds,
            sessionId: result.session_id,
            improvement: index > 0 ? result.score_percentage - resultsResponse.results[index - 1].score_percentage : undefined
          }));
        setRecentResults(recentResultsData);

        // Load user sessions
        const sessionsResponse = await supabaseExamService.getUserSessions(user.id);
        const activeSessionsData = (sessionsResponse.sessions || [])
          .filter(session => session.status === 'in_progress' || session.status === 'paused')
          .map(session => ({
            id: session.id,
            examId: session.exam_id, // Include exam ID for navigation
            examTitle: session.exam_title || 'Unknown Exam',
            progress: session.questions_answered && session.total_questions 
              ? Math.round((session.questions_answered / session.total_questions) * 100)
              : 0,
            timeSpent: Math.round((session.progress || 0) / 60),
            status: session.status === 'in_progress' ? 'active' : 'paused'
          }));
        setActiveSessions(activeSessionsData);

        // Calculate dashboard stats
        const stats: DashboardStats = {
          totalExams: availableExams.length,
          completedExams: resultsResponse.results?.length || 0,
          averageScore: resultsResponse.results?.length > 0 
            ? Math.round(resultsResponse.results.reduce((sum, r) => sum + r.score_percentage, 0) / resultsResponse.results.length)
            : 0,
          totalStudyTime: Math.round((resultsResponse.results?.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) || 0) / 60)
        };
        setDashboardStats(stats);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Good</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pass</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Fail</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case 'paused': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Paused</Badge>;
      case 'completed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Completed</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleStartNewSession = () => {
    router.push('/exams');
  };

  const handleContinueSession = (session: ActiveSession) => {
    // Navigate to the exam practice page with session ID
    router.push(`/exam/${session.examId}/practice?sessionId=${session.id}`);
  };

  const handleViewAllResults = () => {
    router.push('/results');
  };

  const handleBrowseExams = () => {
    router.push('/exams');
  };

  const handleReviewRecentExams = () => {
    if (recentResults.length > 0) {
      // Navigate to the most recent exam review
      router.push(`/exam-review/${recentResults[0].sessionId}`);
    } else {
      // If no recent results, go to exams page
      router.push('/exams');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect on error
      router.push('/');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-64" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            
            {/* Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </Card>
              ))}
            </div>

            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <div className="space-y-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex items-center space-x-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Breadcrumb */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Azure Practice Hub</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Dashboard</span>
                <span>/</span>
                <span className="text-gray-900 dark:text-white">Overview</span>
              </nav>
            </div>

            {/* Right side - Search, Notifications, Profile */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search exams, results..."
                  className="pl-10 w-64 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium">
                        {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email || 'user@example.com'}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here&apos;s what&apos;s happening with your Azure certification journey today.
          </p>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Available Exams</CardTitle>
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{dashboardStats.totalExams}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                <span className="flex items-center">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Ready to practice
                </span>
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Completed Exams</CardTitle>
              <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">{dashboardStats.completedExams}</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                <span className="flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {dashboardStats.completedExams > 0 ? 'Great progress!' : 'Start your journey'}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Average Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{dashboardStats.averageScore}%</div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                <span className="flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {dashboardStats.averageScore >= 70 ? 'Keep it up!' : 'Room for improvement'}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{dashboardStats.totalStudyTime}m</div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Total time invested
                </span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Results */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Recent Results</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Your latest exam performance
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8" onClick={handleViewAllResults}>
                  View All
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentResults.length > 0 ? (
                    recentResults.map((result) => (
                      <div key={result.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            result.score >= 90 ? 'bg-green-100 dark:bg-green-900/30' :
                            result.score >= 80 ? 'bg-blue-100 dark:bg-blue-900/30' :
                            result.score >= 70 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                            'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            <span className={`text-lg font-bold ${
                              result.score >= 90 ? 'text-green-600 dark:text-green-400' :
                              result.score >= 80 ? 'text-blue-600 dark:text-blue-400' :
                              result.score >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {result.score}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.examTitle}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getScoreBadge(result.score)}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(result.completedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(result.timeSpent)}
                          </span>
                          {result.improvement && (
                            <span className={`text-xs flex items-center ${
                              result.improvement > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {result.improvement > 0 ? (
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 mr-1" />
                              )}
                              {Math.abs(result.improvement)}%
                            </span>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                            onClick={() => router.push(`/exam-review/${result.sessionId}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/exam-review/${result.sessionId}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Review Exam</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/exams`)}>
                              <Target className="mr-2 h-4 w-4" />
                              <span>Take Again</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="mr-2 h-4 w-4" />
                              <span>Share</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">No results yet</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Complete your first exam to see your results here.
                      </p>
                      <Button onClick={handleBrowseExams} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start Your First Exam
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Sessions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Active Sessions</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Continue where you left off
                  </CardDescription>
                </div>
                <Button size="sm" className="h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={handleStartNewSession}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Session
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeSessions.length > 0 ? (
                    activeSessions.map((session) => (
                      <div key={session.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {session.examTitle}
                          </h4>
                          {getStatusBadge(session.status)}
                        </div>
                        
                        <div className="space-y-3">
                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">Progress</span>
                              <span className="text-gray-900 dark:text-white font-medium">{session.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${session.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Session Info */}
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              {formatTime(session.timeSpent)}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {session.status === 'active' ? 'In Progress' : 'Paused'}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex space-x-2">
                            {session.status === 'active' ? (
                              <Button size="sm" className="flex-1 h-8 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800" onClick={() => handleContinueSession(session)}>
                                Continue
                              </Button>
                            ) : (
                              <Button size="sm" className="flex-1 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={() => handleContinueSession(session)}>
                                Resume
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 px-3">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/exam-review/${session.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>Review Progress</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/exams`)}>
                                  <Target className="mr-2 h-4 w-4" />
                                  <span>Start New</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push('/settings')}>
                                  <Settings className="mr-2 h-4 w-4" />
                                  <span>Settings</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">No active sessions</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Start a new practice session to continue your learning journey.
                      </p>
                      <Button onClick={handleStartNewSession} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Start New Session
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">Quick Actions</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Jump into your next learning activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col space-y-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600" onClick={handleBrowseExams}>
                  <Target className="h-6 w-6 text-blue-600" />
                  <span className="text-sm font-medium">Browse Exams</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600" onClick={handleViewAllResults}>
                  <Award className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium">View Results</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600" onClick={handleReviewRecentExams}>
                  <Eye className="h-6 w-6 text-purple-600" />
                  <span className="text-sm font-medium">Review Exams</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600" onClick={() => router.push('/settings')}>
                  <Settings className="h-6 w-6 text-orange-600" />
                  <span className="text-sm font-medium">Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}