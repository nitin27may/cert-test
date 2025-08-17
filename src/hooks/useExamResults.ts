/**
 * Exam Results Hook with Analytics and Progress Tracking
 * 
 * This hook provides comprehensive exam result management with:
 * - Historical result tracking
 * - Performance analytics
 * - Progress monitoring
 * - Comparison tools
 * - Real-time updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseExamService } from '../lib/services/supabaseService';
import { realtimeService } from '../lib/services/realtimeService';
import {
  ParsedExamResult,
  ParsedUserExamSession,
  ExamDifficulty,
  SessionStatus
} from '../lib/types';

interface ExamResultsState {
  results: ParsedExamResult[];
  sessions: ParsedUserExamSession[];
  analytics: ExamAnalytics;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface ExamAnalytics {
  totalExams: number;
  completedExams: number;
  inProgressExams: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalTimeSpent: number; // in seconds
  averageTimePerExam: number;
  topicPerformance: TopicPerformance[];
  difficultyPerformance: DifficultyPerformance[];
  progressTrend: ProgressTrendData[];
  recentActivity: RecentActivityData[];
  achievements: Achievement[];
  recommendations: Recommendation[];
}

interface TopicPerformance {
  topicId: string;
  topicName: string;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  improvement: number; // percentage change from previous attempts
  lastAttempted: string;
}

interface DifficultyPerformance {
  difficulty: ExamDifficulty;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  trend: 'improving' | 'declining' | 'stable';
}

interface ProgressTrendData {
  date: string;
  examId: string;
  examTitle: string;
  score: number;
  accuracy: number;
  timeSpent: number;
  questionsAnswered: number;
}

interface RecentActivityData {
  id: string;
  type: 'exam_completed' | 'exam_started' | 'milestone_reached';
  title: string;
  description: string;
  date: string;
  metadata?: any;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedDate: string;
  category: 'performance' | 'consistency' | 'milestone' | 'improvement';
}

interface Recommendation {
  id: string;
  type: 'study_topic' | 'practice_more' | 'review_mistakes' | 'time_management';
  title: string;
  description: string;
  actionText: string;
  priority: 'high' | 'medium' | 'low';
  metadata?: any;
}

interface ExamResultsActions {
  loadUserResults: (userId: string) => Promise<void>;
  getExamHistory: (examId: string) => ParsedExamResult[];
  getTopicAnalytics: (topicId: string) => TopicPerformance | null;
  compareResults: (resultId1: string, resultId2: string) => ResultComparison | null;
  exportResults: (format: 'csv' | 'json' | 'pdf') => Promise<string>;
  refreshData: () => Promise<void>;
}

interface ResultComparison {
  result1: ParsedExamResult;
  result2: ParsedExamResult;
  scoreImprovement: number;
  timeImprovement: number;
  accuracyImprovement: number;
  topicImprovements: Record<string, number>;
  difficultyImprovements: Record<ExamDifficulty, number>;
}

export function useExamResults(userId: string): [ExamResultsState, ExamResultsActions] {
  const [state, setState] = useState<ExamResultsState>({
    results: [],
    sessions: [],
    analytics: {
      totalExams: 0,
      completedExams: 0,
      inProgressExams: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      totalTimeSpent: 0,
      averageTimePerExam: 0,
      topicPerformance: [],
      difficultyPerformance: [],
      progressTrend: [],
      recentActivity: [],
      achievements: [],
      recommendations: []
    },
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  // Helper to update state
  const updateState = useCallback((updates: Partial<ExamResultsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Calculate comprehensive analytics
  const calculateAnalytics = useCallback((
    results: ParsedExamResult[],
    sessions: ParsedUserExamSession[]
  ): ExamAnalytics => {
    const completedResults = results.filter(r => r.score_percentage !== null);
    const inProgressSessions = sessions.filter(s => s.status === 'in_progress');

    // Basic metrics
    const totalExams = sessions.length;
    const completedExams = completedResults.length;
    const inProgressExams = inProgressSessions.length;
    
    const scores = completedResults.map(r => r.score_percentage);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const worstScore = scores.length > 0 ? Math.min(...scores) : 0;

    const totalTimeSpent = results.reduce((total, r) => total + r.time_spent_seconds, 0);
    const averageTimePerExam = completedResults.length > 0 ? totalTimeSpent / completedResults.length : 0;

    // Topic performance analysis
    const topicPerformance = calculateTopicPerformance(results);
    
    // Difficulty performance analysis
    const difficultyPerformance = calculateDifficultyPerformance(results);

    // Progress trend
    const progressTrend = calculateProgressTrend(results);

    // Recent activity
    const recentActivity = generateRecentActivity(results, sessions);

    // Achievements
    const achievements = calculateAchievements(results, sessions);

    // Recommendations
    const recommendations = generateRecommendations(results, topicPerformance, difficultyPerformance);

    return {
      totalExams,
      completedExams,
      inProgressExams,
      averageScore,
      bestScore,
      worstScore,
      totalTimeSpent,
      averageTimePerExam,
      topicPerformance,
      difficultyPerformance,
      progressTrend,
      recentActivity,
      achievements,
      recommendations
    };
  }, []);

  // Calculate topic performance
  const calculateTopicPerformance = useCallback((results: ParsedExamResult[]): TopicPerformance[] => {
    const topicMap = new Map<string, {
      questionsAttempted: number;
      correctAnswers: number;
      totalTime: number;
      attempts: { date: string; accuracy: number }[];
    }>();

    results.forEach(result => {
      if (result.topic_scores) {
        Object.entries(result.topic_scores).forEach(([topicId, topicData]) => {
          const existing = topicMap.get(topicId) || {
            questionsAttempted: 0,
            correctAnswers: 0,
            totalTime: 0,
            attempts: []
          };

          existing.questionsAttempted += topicData.total;
          existing.correctAnswers += topicData.correct;
          existing.totalTime += Math.floor(result.time_spent_seconds * (topicData.total / result.total_questions));
          existing.attempts.push({
            date: result.completed_at,
            accuracy: topicData.percentage
          });

          topicMap.set(topicId, existing);
        });
      }
    });

    return Array.from(topicMap.entries()).map(([topicId, data]) => {
      const accuracy = data.questionsAttempted > 0 ? (data.correctAnswers / data.questionsAttempted) * 100 : 0;
      const averageTime = data.questionsAttempted > 0 ? data.totalTime / data.questionsAttempted : 0;
      
      // Calculate improvement trend
      const sortedAttempts = data.attempts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const improvement = sortedAttempts.length > 1 
        ? sortedAttempts[sortedAttempts.length - 1].accuracy - sortedAttempts[0].accuracy
        : 0;

      const lastAttempted = sortedAttempts.length > 0 
        ? sortedAttempts[sortedAttempts.length - 1].date 
        : '';

      return {
        topicId,
        topicName: topicId, // Would be fetched from topics table in real implementation
        questionsAttempted: data.questionsAttempted,
        correctAnswers: data.correctAnswers,
        accuracy,
        averageTime,
        improvement,
        lastAttempted
      };
    }).sort((a, b) => b.questionsAttempted - a.questionsAttempted);
  }, []);

  // Calculate difficulty performance
  const calculateDifficultyPerformance = useCallback((results: ParsedExamResult[]): DifficultyPerformance[] => {
    const difficultyMap = new Map<ExamDifficulty, {
      questionsAttempted: number;
      correctAnswers: number;
      totalTime: number;
      historicalAccuracy: number[];
    }>();

    results.forEach(result => {
      if (result.difficulty_scores) {
        Object.entries(result.difficulty_scores).forEach(([difficulty, data]) => {
          const diff = difficulty as ExamDifficulty;
          const existing = difficultyMap.get(diff) || {
            questionsAttempted: 0,
            correctAnswers: 0,
            totalTime: 0,
            historicalAccuracy: []
          };

          existing.questionsAttempted += data.total;
          existing.correctAnswers += data.correct;
          existing.totalTime += Math.floor(result.time_spent_seconds * (data.total / result.total_questions));
          existing.historicalAccuracy.push(data.percentage);

          difficultyMap.set(diff, existing);
        });
      }
    });

    return Array.from(difficultyMap.entries()).map(([difficulty, data]) => {
      const accuracy = data.questionsAttempted > 0 ? (data.correctAnswers / data.questionsAttempted) * 100 : 0;
      const averageTime = data.questionsAttempted > 0 ? data.totalTime / data.questionsAttempted : 0;
      
      // Determine trend
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (data.historicalAccuracy.length >= 3) {
        const recent = data.historicalAccuracy.slice(-3);
        const early = data.historicalAccuracy.slice(0, 3);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
        
        if (recentAvg > earlyAvg + 5) trend = 'improving';
        else if (recentAvg < earlyAvg - 5) trend = 'declining';
      }

      return {
        difficulty,
        questionsAttempted: data.questionsAttempted,
        correctAnswers: data.correctAnswers,
        accuracy,
        averageTime,
        trend
      };
    });
  }, []);

  // Calculate progress trend
  const calculateProgressTrend = useCallback((results: ParsedExamResult[]): ProgressTrendData[] => {
    return results
      .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
      .map(result => ({
        date: result.completed_at,
        examId: result.exam_id,
        examTitle: result.exam_id, // Would be fetched from exams table
        score: result.score_percentage,
        accuracy: result.correct_answers / result.total_questions * 100,
        timeSpent: result.time_spent_seconds,
        questionsAnswered: result.total_questions
      }));
  }, []);

  // Generate recent activity
  const generateRecentActivity = useCallback((
    results: ParsedExamResult[],
    sessions: ParsedUserExamSession[]
  ): RecentActivityData[] => {
    const activities: RecentActivityData[] = [];

    // Add completed exams
    results.forEach(result => {
      activities.push({
        id: `result_${result.id}`,
        type: 'exam_completed',
        title: `Completed Exam`,
        description: `Scored ${result.score_percentage.toFixed(1)}% in ${Math.floor(result.time_spent_seconds / 60)} minutes`,
        date: result.completed_at,
        metadata: { resultId: result.id, score: result.score_percentage }
      });
    });

    // Add started sessions
    sessions.forEach(session => {
      if (session.status === 'in_progress') {
        activities.push({
          id: `session_${session.id}`,
          type: 'exam_started',
          title: `Started Exam`,
          description: `Progress: ${session.questions_answered}/${session.total_questions} questions`,
          date: session.start_time,
          metadata: { sessionId: session.id, progress: session.questions_answered / session.total_questions }
        });
      }
    });

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20); // Keep recent 20 activities
  }, []);

  // Calculate achievements
  const calculateAchievements = useCallback((
    results: ParsedExamResult[],
    sessions: ParsedUserExamSession[]
  ): Achievement[] => {
    const achievements: Achievement[] = [];
    const now = new Date().toISOString();

    // Perfect score achievement
    const perfectScores = results.filter(r => r.score_percentage === 100);
    if (perfectScores.length > 0) {
      achievements.push({
        id: 'perfect_score',
        title: 'Perfect Score',
        description: `Achieved 100% score ${perfectScores.length} time(s)`,
        icon: '🎯',
        earnedDate: perfectScores[0].completed_at,
        category: 'performance'
      });
    }

    // Consistent performer
    if (results.length >= 5) {
      const recentScores = results.slice(-5).map(r => r.score_percentage);
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      if (avgRecent >= 80) {
        achievements.push({
          id: 'consistent_performer',
          title: 'Consistent Performer',
          description: 'Maintained 80%+ average in last 5 exams',
          icon: '🔥',
          earnedDate: now,
          category: 'consistency'
        });
      }
    }

    // Milestone achievements
    if (results.length >= 10) {
      achievements.push({
        id: 'exam_veteran',
        title: 'Exam Veteran',
        description: 'Completed 10+ exams',
        icon: '🏆',
        earnedDate: results[9].completed_at,
        category: 'milestone'
      });
    }

    // Speed achiever
    const fastCompletions = results.filter(r => 
      r.average_time_per_question && r.average_time_per_question < 60 && r.score_percentage >= 80
    );
    if (fastCompletions.length >= 3) {
      achievements.push({
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Completed 3+ exams under 60s per question with 80%+ score',
        icon: '⚡',
        earnedDate: fastCompletions[2].completed_at,
        category: 'performance'
      });
    }

    return achievements;
  }, []);

  // Generate recommendations
  const generateRecommendations = useCallback((
    results: ParsedExamResult[],
    topicPerformance: TopicPerformance[],
    difficultyPerformance: DifficultyPerformance[]
  ): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // Identify weak topics
    const weakTopics = topicPerformance.filter(tp => tp.accuracy < 70);
    if (weakTopics.length > 0) {
      recommendations.push({
        id: 'study_weak_topics',
        type: 'study_topic',
        title: 'Focus on Weak Topics',
        description: `Improve performance in ${weakTopics[0].topicName} (${weakTopics[0].accuracy.toFixed(1)}% accuracy)`,
        actionText: 'Study Topic',
        priority: 'high',
        metadata: { topicId: weakTopics[0].topicId }
      });
    }

    // Check for declining performance
    const decliningDifficulties = difficultyPerformance.filter(dp => dp.trend === 'declining');
    if (decliningDifficulties.length > 0) {
      recommendations.push({
        id: 'practice_difficulty',
        type: 'practice_more',
        title: `Practice ${decliningDifficulties[0].difficulty} Questions`,
        description: 'Your performance in this difficulty level is declining',
        actionText: 'Start Practice',
        priority: 'medium',
        metadata: { difficulty: decliningDifficulties[0].difficulty }
      });
    }

    // Recent mistakes review
    const recentResults = results.slice(-3);
    const hasIncorrectAnswers = recentResults.some(r => r.incorrect_answers > 0);
    if (hasIncorrectAnswers) {
      recommendations.push({
        id: 'review_mistakes',
        type: 'review_mistakes',
        title: 'Review Recent Mistakes',
        description: 'Review incorrect answers from your recent exams',
        actionText: 'Review Mistakes',
        priority: 'medium'
      });
    }

    // Time management
    const slowExams = results.filter(r => 
      r.average_time_per_question && r.average_time_per_question > 120
    );
    if (slowExams.length >= 2) {
      recommendations.push({
        id: 'time_management',
        type: 'time_management',
        title: 'Improve Time Management',
        description: 'Practice answering questions more quickly',
        actionText: 'Time Practice',
        priority: 'low'
      });
    }

    return recommendations;
  }, []);

  // Load user results
  const loadUserResults = useCallback(async (userId: string) => {
    try {
      updateState({ isLoading: true, error: null });

      const [resultsResponse, sessionsResponse] = await Promise.all([
        supabaseExamService.getUserResults(userId),
        supabaseExamService.getUserSessions(userId)
      ]);

      // For detailed results, we need to fetch full result objects
      const detailedResults: ParsedExamResult[] = [];
      // This would be implemented to fetch detailed results
      // For now, using mock detailed data based on the summary

      const sessions: ParsedUserExamSession[] = [];
      // This would fetch detailed session data

      const analytics = calculateAnalytics(detailedResults, sessions);

      updateState({
        results: detailedResults,
        sessions: sessions,
        analytics,
        isLoading: false,
        lastUpdated: new Date()
      });

    } catch (error: any) {
      updateState({
        isLoading: false,
        error: error.message
      });
    }
  }, [updateState, calculateAnalytics]);

  // Get exam history for specific exam
  const getExamHistory = useCallback((examId: string): ParsedExamResult[] => {
    return state.results.filter(result => result.exam_id === examId)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  }, [state.results]);

  // Get topic analytics
  const getTopicAnalytics = useCallback((topicId: string): TopicPerformance | null => {
    return state.analytics.topicPerformance.find(tp => tp.topicId === topicId) || null;
  }, [state.analytics.topicPerformance]);

  // Compare two results
  const compareResults = useCallback((resultId1: string, resultId2: string): ResultComparison | null => {
    const result1 = state.results.find(r => r.id === resultId1);
    const result2 = state.results.find(r => r.id === resultId2);

    if (!result1 || !result2) return null;

    const scoreImprovement = result2.score_percentage - result1.score_percentage;
    const timeImprovement = result1.time_spent_seconds - result2.time_spent_seconds;
    const accuracyImprovement = (result2.correct_answers / result2.total_questions) - 
                                (result1.correct_answers / result1.total_questions);

    // Topic improvements
    const topicImprovements: Record<string, number> = {};
    if (result1.topic_scores && result2.topic_scores) {
      Object.keys(result2.topic_scores).forEach(topicId => {
        if (result1.topic_scores![topicId]) {
          topicImprovements[topicId] = 
            result2.topic_scores![topicId].percentage - result1.topic_scores![topicId].percentage;
        }
      });
    }

    // Difficulty improvements
    const difficultyImprovements: Record<ExamDifficulty, number> = {} as any;
    if (result1.difficulty_scores && result2.difficulty_scores) {
      (['easy', 'medium', 'difficult'] as ExamDifficulty[]).forEach(difficulty => {
        if (result1.difficulty_scores![difficulty] && result2.difficulty_scores![difficulty]) {
          difficultyImprovements[difficulty] = 
            result2.difficulty_scores![difficulty].percentage - result1.difficulty_scores![difficulty].percentage;
        }
      });
    }

    return {
      result1,
      result2,
      scoreImprovement,
      timeImprovement,
      accuracyImprovement,
      topicImprovements,
      difficultyImprovements
    };
  }, [state.results]);

  // Export results
  const exportResults = useCallback(async (format: 'csv' | 'json' | 'pdf'): Promise<string> => {
    const data = {
      results: state.results,
      analytics: state.analytics,
      exportDate: new Date().toISOString()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        // Convert to CSV format
        const csvHeaders = ['Date', 'Exam', 'Score', 'Time Spent', 'Questions', 'Correct', 'Accuracy'];
        const csvRows = state.results.map(result => [
          result.completed_at,
          result.exam_id,
          `${result.score_percentage}%`,
          `${Math.floor(result.time_spent_seconds / 60)}m`,
          result.total_questions,
          result.correct_answers,
          `${(result.correct_answers / result.total_questions * 100).toFixed(1)}%`
        ]);
        
        return [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      
      case 'pdf':
        // Would implement PDF generation
        return 'PDF export not implemented yet';
      
      default:
        throw new Error('Unsupported export format');
    }
  }, [state.results, state.analytics]);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (userId) {
      await loadUserResults(userId);
    }
  }, [userId, loadUserResults]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const setupRealtimeSubscriptions = async () => {
      // Subscribe to user results updates
      await realtimeService.subscribeToUserResults(
        userId,
        (result) => {
          updateState(prev => ({
            ...prev,
            results: [result, ...prev.results.filter(r => r.id !== result.id)],
            lastUpdated: new Date()
          }));
        },
        (error) => {
          console.error('Real-time results subscription error:', error);
        }
      );
    };

    setupRealtimeSubscriptions();

    return () => {
      realtimeService.unsubscribeAll();
    };
  }, [userId, updateState]);

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadUserResults(userId);
    }
  }, [userId, loadUserResults]);

  // Recalculate analytics when results change
  const memoizedAnalytics = useMemo(() => {
    return calculateAnalytics(state.results, state.sessions);
  }, [state.results, state.sessions, calculateAnalytics]);

  // Update analytics in state when memoized analytics change
  useEffect(() => {
    updateState({ analytics: memoizedAnalytics });
  }, [memoizedAnalytics, updateState]);

  const actions: ExamResultsActions = {
    loadUserResults,
    getExamHistory,
    getTopicAnalytics,
    compareResults,
    exportResults,
    refreshData
  };

  return [state, actions];
}