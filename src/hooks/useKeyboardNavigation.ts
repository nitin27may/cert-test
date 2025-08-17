import { useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { nextQuestion, previousQuestion, checkAnswer } from '@/store/examSlice';

interface KeyboardNavigationOptions {
  enabled?: boolean;
  onAnswerSelect?: (index: number) => void;
  onCheckAnswer?: () => void;
  currentQuestionId?: number;
}

export function useKeyboardNavigation({
  enabled = true,
  onAnswerSelect,
  onCheckAnswer,
  currentQuestionId,
}: KeyboardNavigationOptions = {}) {
  const dispatch = useAppDispatch();
  const keyboardEnabled = useAppSelector((state) => state.preferences.keyboardNavigation);
  const examSession = useAppSelector((state) => state.exam.examSession);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!enabled || !keyboardEnabled || !examSession) return;

    // Don't trigger if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const currentQuestion = examSession.questions[examSession.current_question_index];
    if (!currentQuestion) return;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        dispatch(previousQuestion());
        break;

      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        dispatch(nextQuestion());
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onCheckAnswer) {
          onCheckAnswer();
        } else if (currentQuestionId) {
          dispatch(checkAnswer(currentQuestionId));
        }
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        event.preventDefault();
        const answerIndex = parseInt(event.key) - 1;
        if (answerIndex < currentQuestion.options.length && onAnswerSelect) {
          onAnswerSelect(answerIndex);
        }
        break;

      case 'h':
      case 'H':
        // Show help/shortcuts
        event.preventDefault();
        // Could trigger a help modal
        break;

      case 'Escape':
        event.preventDefault();
        // Could be used to close modals or exit full screen
        break;

      default:
        break;
    }
  }, [
    enabled,
    keyboardEnabled,
    examSession,
    onAnswerSelect,
    onCheckAnswer,
    currentQuestionId,
    dispatch
  ]);

  useEffect(() => {
    if (enabled && keyboardEnabled) {
      document.addEventListener('keydown', handleKeyPress);
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [handleKeyPress, enabled, keyboardEnabled]);

  // Return keyboard shortcuts info
  return {
    shortcuts: {
      navigation: {
        'Arrow Keys': 'Navigate between questions',
        '← ↑': 'Previous question',
        '→ ↓': 'Next question',
      },
      answers: {
        '1-9': 'Select answer option',
        'Enter/Space': 'Check answer',
      },
      other: {
        'H': 'Show help',
        'Esc': 'Close modals',
      },
    },
    isEnabled: enabled && keyboardEnabled,
  };
}

// Hook for managing keyboard shortcuts in specific contexts
export function useContextualKeyboard(context: 'exam' | 'setup' | 'results') {
  const keyboardEnabled = useAppSelector((state) => state.preferences.keyboardNavigation);

  const getShortcuts = useCallback(() => {
    const baseShortcuts = {
      'Esc': 'Go back',
      'Tab': 'Navigate form elements',
    };

    switch (context) {
      case 'exam':
        return {
          ...baseShortcuts,
          '← →': 'Navigate questions',
          '1-9': 'Select answers',
          'Enter': 'Check answer',
          'Space': 'Check answer',
        };
      
      case 'setup':
        return {
          ...baseShortcuts,
          'Enter': 'Start exam',
          'Space': 'Toggle topic selection',
        };
      
      case 'results':
        return {
          ...baseShortcuts,
          'R': 'Restart exam',
          'H': 'Go home',
        };
      
      default:
        return baseShortcuts;
    }
  }, [context]);

  return {
    shortcuts: getShortcuts(),
    isEnabled: keyboardEnabled,
  };
}
