import { useAppSelector, useAppDispatch } from './redux';
import { loadExam, startExamSession, resumeExamSession, resetExamSession } from '@/store/examSlice';

export function useExamState() {
  const dispatch = useAppDispatch();
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
    return dispatch(startExamSession(params));
  };

  const resumeSession = async (examId: string) => {
    return dispatch(resumeExamSession(examId));
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
