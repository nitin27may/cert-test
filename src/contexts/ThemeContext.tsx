'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get theme from localStorage or system preference
    let initialTheme: 'light' | 'dark' | 'system' = 'system';
    
    try {
      // Check localStorage for theme preference
      const storedTheme = localStorage.getItem('theme-preference') as 'light' | 'dark' | 'system' | null;
      if (storedTheme) {
        initialTheme = storedTheme;
      }
    } catch (error) {
      console.error('Error getting initial theme:', error);
    }
    
    setThemeState(initialTheme);
    applyTheme(initialTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (newTheme === 'system') {
      // Remove any existing theme classes and let CSS handle system preference
      root.classList.remove('light', 'dark');
      // Check system preference and apply accordingly
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (systemTheme === 'dark') {
        root.classList.add('dark');
      }
    } else if (newTheme === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const effectiveTheme = newTheme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : newTheme;
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#1f2937' : '#ffffff');
    }
  };

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    
    // Save to user session if authenticated
    try {
      // Save theme preference to localStorage
      localStorage.setItem('theme-preference', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
      // Fallback to localStorage
      localStorage.setItem('theme-preference', newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Prevent hydration mismatch
  if (!mounted) {
    // Provide a default theme context during mounting without forcing light bg to avoid FOUC
    const defaultValue: ThemeContextType = {
      theme: 'system',
      toggleTheme: () => {},
      setTheme: () => {}
    };
    
    return (
      <ThemeContext.Provider value={defaultValue}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Safe hook that returns a default value during SSR
export function useThemeSafe() {
  const context = useContext(ThemeContext);
  
  // Return default values during SSR or when provider is not mounted
  if (context === undefined) {
    return {
      theme: 'light' as const,
      toggleTheme: () => {},
      setTheme: () => {}
    };
  }
  
  return context;
}

// Theme-aware utility component
export function ThemeScript() {
  const script = `
    (function() {
      function getInitialTheme() {
        const storedTheme = localStorage.getItem('theme-preference');
        if (storedTheme) return storedTheme;
        
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      const theme = getInitialTheme();
      document.documentElement.classList.toggle('dark', theme === 'dark');
      
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.content = theme === 'dark' ? '#1f2937' : '#ffffff';
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
