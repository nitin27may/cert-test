import { useState, useEffect } from 'react';


// Hook for managing localStorage state
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading from localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage only if we're in the browser
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// Hook for managing localStorage with object updates
export function useLocalStorageObject<T extends Record<string, any>>(
  key: string,
  initialValue: T
): [T, (updates: Partial<T>) => void, (value: T) => void] {
  const [storedValue, setStoredValue] = useLocalStorage(key, initialValue);

  const updateValue = (updates: Partial<T>) => {
    setStoredValue(prev => ({ ...prev, ...updates }));
  };

  return [storedValue, updateValue, setStoredValue];
}

// Hook for managing localStorage with array operations
export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[] = []
): [T[], {
  add: (item: T) => void;
  remove: (item: T) => void;
  toggle: (item: T) => void;
  clear: () => void;
  set: (items: T[]) => void;
}] {
  const [storedValue, setStoredValue] = useLocalStorage(key, initialValue);

  const operations = {
    add: (item: T) => {
      setStoredValue(prev => [...prev, item]);
    },
    
    remove: (item: T) => {
      setStoredValue(prev => prev.filter(i => i !== item));
    },
    
    toggle: (item: T) => {
      setStoredValue(prev => 
        prev.includes(item) 
          ? prev.filter(i => i !== item)
          : [...prev, item]
      );
    },
    
    clear: () => {
      setStoredValue([]);
    },
    
    set: (items: T[]) => {
      setStoredValue(items);
    }
  };

  return [storedValue, operations];
}
