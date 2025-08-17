import { useState, useEffect } from 'react';
import { examService } from '../lib/api/examService';
import { Exam, Question } from '../lib/types';

interface UseExamDataResult {
  exam: Exam | null;
  questions: Question[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExamData(examId: string, questionCount?: number, selectedTopics?: string[]): UseExamDataResult {
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const examData = await examService.getExamById(examId);
      if (!examData) {
        throw new Error(`Exam '${examId}' not found`);
      }

      const examQuestions = await examService.getExamQuestions(examId, questionCount, selectedTopics);
      
      setExam(examData);
      setQuestions(examQuestions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load exam data';
      setError(errorMessage);
      console.error('Failed to fetch exam data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchExamData();
    }
  }, [examId, questionCount, JSON.stringify(selectedTopics)]);

  const refetch = () => {
    examService.clearCache();
    fetchExamData();
  };

  return {
    exam,
    questions,
    loading,
    error,
    refetch
  };
}

interface UseAvailableExamsResult {
  exams: Array<{ id: string; title: string; description: string; totalQuestions: number; networkingFocusPercentage?: number }>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAvailableExams(): UseAvailableExamsResult {
  const [exams, setExams] = useState<Array<{ id: string; title: string; description: string; totalQuestions: number; networkingFocusPercentage?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableExams = async () => {
    try {
      setLoading(true);
      setError(null);

      const availableExams = await examService.getAvailableExams();
      setExams(availableExams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load available exams';
      setError(errorMessage);
      console.error('Failed to fetch available exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableExams();
  }, []);

  const refetch = () => {
    examService.clearCache();
    fetchAvailableExams();
  };

  return {
    exams,
    loading,
    error,
    refetch
  };
}
