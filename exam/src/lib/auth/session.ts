// Session Management System
export interface UserSession {
  email: string;
  loginTime: string;
  lastActivity: string;
}

export interface UserData {
  email: string;
  examProgress: Record<string, any>;
  examHistory: Array<any>;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    autoSave: boolean;
  };
  stats: {
    totalExamsTaken: number;
    totalQuestionsAnswered: number;
    averageScore: number;
    timeSpent: number;
  };
}

class SessionManager {
  private readonly SESSION_KEY = 'azure_exam_session';
  private readonly USER_DATA_PREFIX = 'azure_exam_user_';

  // Session Management
  createSession(email: string): UserSession {
    const session: UserSession = {
      email,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    
    // Initialize user data if it doesn't exist
    this.initializeUserData(email);
    
    return session;
  }

  getSession(): UserSession | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData) as UserSession;
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  updateLastActivity(): void {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData) as UserSession;
        session.lastActivity = new Date().toISOString();
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      }
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }

  clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem('user_authenticated'); // Legacy cleanup
  }

  isAuthenticated(): boolean {
    const session = this.getSession();
    return session !== null;
  }

  getCurrentUserEmail(): string | null {
    const session = this.getSession();
    return session?.email || null;
  }

  // User Data Management
  private getUserDataKey(email: string): string {
    return `${this.USER_DATA_PREFIX}${btoa(email)}`; // Base64 encode email for safe storage key
  }

  private initializeUserData(email: string): void {
    const key = this.getUserDataKey(email);
    const existingData = localStorage.getItem(key);
    
    if (!existingData) {
      const initialData: UserData = {
        email,
        examProgress: {},
        examHistory: [],
        preferences: {
          theme: 'light',
          notifications: true,
          autoSave: true
        },
        stats: {
          totalExamsTaken: 0,
          totalQuestionsAnswered: 0,
          averageScore: 0,
          timeSpent: 0
        }
      };
      
      localStorage.setItem(key, JSON.stringify(initialData));
    }
  }

  getUserData(): UserData | null {
    const email = this.getCurrentUserEmail();
    if (!email) return null;
    
    try {
      const key = this.getUserDataKey(email);
      const userData = localStorage.getItem(key);
      if (!userData) return null;
      
      return JSON.parse(userData) as UserData;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  updateUserData(updates: Partial<UserData>): boolean {
    const email = this.getCurrentUserEmail();
    if (!email) return false;
    
    try {
      const currentData = this.getUserData();
      if (!currentData) return false;
      
      const updatedData: UserData = {
        ...currentData,
        ...updates,
        email // Ensure email doesn't get overwritten
      };
      
      const key = this.getUserDataKey(email);
      localStorage.setItem(key, JSON.stringify(updatedData));
      return true;
    } catch (error) {
      console.error('Error updating user data:', error);
      return false;
    }
  }

  // Exam Progress Management
  getExamProgress(examId: string): any {
    const userData = this.getUserData();
    return userData?.examProgress[examId] || null;
  }

  updateExamProgress(examId: string, progress: any): boolean {
    const userData = this.getUserData();
    if (!userData) return false;
    
    const updatedProgress = {
      ...userData.examProgress,
      [examId]: {
        ...progress,
        lastUpdated: new Date().toISOString()
      }
    };
    
    return this.updateUserData({ examProgress: updatedProgress });
  }

  // Exam History Management
  addExamToHistory(examResult: any): boolean {
    const userData = this.getUserData();
    if (!userData) return false;
    
    const newHistory = [
      {
        ...examResult,
        completedAt: new Date().toISOString()
      },
      ...userData.examHistory
    ];
    
    // Keep only last 50 exam results to prevent storage bloat
    const trimmedHistory = newHistory.slice(0, 50);
    
    return this.updateUserData({ examHistory: trimmedHistory });
  }

  getExamHistory(): any[] {
    const userData = this.getUserData();
    return userData?.examHistory || [];
  }

  // Statistics Management
  updateStats(updates: Partial<UserData['stats']>): boolean {
    const userData = this.getUserData();
    if (!userData) return false;
    
    const updatedStats = {
      ...userData.stats,
      ...updates
    };
    
    return this.updateUserData({ stats: updatedStats });
  }

  // Theme Management
  setTheme(theme: 'light' | 'dark'): boolean {
    const userData = this.getUserData();
    if (!userData) return false;
    
    const updatedPreferences = {
      ...userData.preferences,
      theme
    };
    
    return this.updateUserData({ preferences: updatedPreferences });
  }

  getTheme(): 'light' | 'dark' {
    const userData = this.getUserData();
    return userData?.preferences.theme || 'light';
  }

  // Migration from old storage format
  migrateOldData(): void {
    const email = this.getCurrentUserEmail();
    if (!email) return;

    try {
      // Migrate old exam progress
      const oldActiveExams = localStorage.getItem('azure_exam_active_exams');
      if (oldActiveExams) {
        const activeExams = JSON.parse(oldActiveExams);
        this.updateUserData({ examProgress: activeExams });
        localStorage.removeItem('azure_exam_active_exams');
      }

      // Migrate other old data as needed
      // ... add more migration logic here
    } catch (error) {
      console.error('Error migrating old data:', error);
    }
  }

  // Cleanup methods
  clearUserData(): boolean {
    const email = this.getCurrentUserEmail();
    if (!email) return false;
    
    try {
      const key = this.getUserDataKey(email);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error clearing user data:', error);
      return false;
    }
  }

  // Get all user emails (for admin purposes)
  getAllUserEmails(): string[] {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(this.USER_DATA_PREFIX))
      .map(key => {
        try {
          return atob(key.replace(this.USER_DATA_PREFIX, ''));
        } catch {
          return null;
        }
      })
      .filter(email => email !== null) as string[];
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Utility functions
export const withAuth = (callback: () => void) => {
  if (!sessionManager.isAuthenticated()) {
    window.location.href = '/';
    return;
  }
  callback();
};

export const getCurrentUser = () => {
  return sessionManager.getCurrentUserEmail();
};

export const isAuthenticated = () => {
  return sessionManager.isAuthenticated();
};
