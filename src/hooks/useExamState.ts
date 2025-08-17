import { useAppSelector, useAppDispatch } from './redux';
import { loadExam, startExamSession, resumeExamSession, resetExamSession } from '@/store/examSlice';
import { useAuth } from '@/contexts/AuthContext';

export function useExamState() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { currentExam, examSession, isLoading, error } = useAppSelector((state) => state.exam);
  const preferences = useAppSelector((state) => state.preferences);

  const loadExamById = async (examId: string) => {
    return dispatch(loadExam(examId));
  };

  const startNewSession = async (params: {
    examId: string;
    selectedTopics: string[];
    questionLimit?: number;
  }) => {
    if (!user?.id) {
      throw new Error('User must be authenticated to start an exam session');
    }
    return dispatch(startExamSession({ ...params, userId: user.id }));
  };

  const resumeSession = async (examId: string) => {
    if (!user?.id) {
      throw new Error('User must be authenticated to resume an exam session');
    }
    return dispatch(resumeExamSession({ examId, userId: user.id }));
  };

  const resetSession = () => {
    dispatch(resetExamSession());
  };

  return {
    currentExam,
    examSession,
    isLoading,
    error,
    preferences,
    loadExamById,
    startNewSession,
    resumeSession,
    resetSession,
  };
}
