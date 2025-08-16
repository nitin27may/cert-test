import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility function to shuffle array (Fisher-Yates algorithm)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Format time duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

// Calculate accuracy percentage
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

// Generate storage keys for different exam sessions
export function getStorageKeys(examId: string) {
  return {
    examSession: `azure_exam_${examId}_session`,
    examState: `azure_exam_${examId}_state`,
    selectedTopics: `azure_exam_${examId}_selected_topics`,
    questionLimit: `azure_exam_${examId}_question_limit`,
    activeExams: 'azure_exam_active_exams',
    userPreferences: 'azure_exam_user_preferences',
  };
}

// Check if arrays are equal (for multiple choice answers)
export function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
}

// Validate answer for single or multiple choice
export function validateAnswer(
  userAnswer: number | number[],
  correctAnswer: number | number[],
  questionType: 'single' | 'multiple'
): boolean {
  if (questionType === 'single') {
    return userAnswer === correctAnswer;
  } else {
    if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) {
      return false;
    }
    return arraysEqual(userAnswer, correctAnswer);
  }
}

// Get question progress percentage
export function getProgressPercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((current + 1) / total) * 100);
}

// Format date for display
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Debounce function for performance optimization
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Local storage helpers with error handling
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};
