import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserPreferences } from '@/lib/types';

// Initial state
const initialState: UserPreferences = {
  theme: 'system',
  defaultTopics: [],
  keyboardNavigation: true,
  showDetailedExplanations: true,
};

// Load preferences from localStorage
function loadPreferences(): UserPreferences {
  try {
    const saved = localStorage.getItem('azure_exam_user_preferences');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...initialState, ...parsed };
    }
  } catch (error) {
    console.error('Error loading preferences from localStorage:', error);
  }
  return initialState;
}

// Save preferences to localStorage
function savePreferences(preferences: UserPreferences) {
  try {
    localStorage.setItem('azure_exam_user_preferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences to localStorage:', error);
  }
}

// Preferences slice
const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: loadPreferences(),
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
      savePreferences(state);
    },

    setDefaultTopics: (state, action: PayloadAction<string[]>) => {
      state.defaultTopics = action.payload;
      savePreferences(state);
    },

    setKeyboardNavigation: (state, action: PayloadAction<boolean>) => {
      state.keyboardNavigation = action.payload;
      savePreferences(state);
    },

    setShowDetailedExplanations: (state, action: PayloadAction<boolean>) => {
      state.showDetailedExplanations = action.payload;
      savePreferences(state);
    },

    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      Object.assign(state, action.payload);
      savePreferences(state);
    },

    resetPreferences: (state) => {
      Object.assign(state, initialState);
      try {
        localStorage.removeItem('azure_exam_user_preferences');
      } catch (error) {
        console.error('Error removing preferences from localStorage:', error);
      }
    },
  },
});

export const {
  setTheme,
  setDefaultTopics,
  setKeyboardNavigation,
  setShowDetailedExplanations,
  updatePreferences,
  resetPreferences,
} = preferencesSlice.actions;

export default preferencesSlice.reducer;
