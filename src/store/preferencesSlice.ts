import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserPreferences } from '@/lib/types';
import { storage } from '@/lib/utils';

// Initial state
const initialState: UserPreferences = {
  theme: 'system',
  defaultTopics: [],
  keyboardNavigation: true,
  showDetailedExplanations: true,
};

// Load preferences from localStorage
function loadPreferences(): UserPreferences {
  const saved = storage.get('azure_exam_user_preferences', initialState);
  return { ...initialState, ...saved };
}

// Save preferences to localStorage
function savePreferences(preferences: UserPreferences) {
  storage.set('azure_exam_user_preferences', preferences);
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
      storage.remove('azure_exam_user_preferences');
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
