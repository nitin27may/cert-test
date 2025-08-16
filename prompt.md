Create a modern Next.js 14 application that converts the existing Azure Practice Exams app with the following specifications:

### **Tech Stack Requirements:**
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Zustand or Redux Toolkit for state management
- Local Storage API for persistence
- React Hook Form for form handling
- Framer Motion for animations

### **Project Structure:**
src/ ├── app/ │ ├── layout.tsx │ ├── page.tsx (test selection) │ ├── exam/[examId]/ │ │ ├── setup/page.tsx │ │ └── practice/page.tsx │ └── api/ (if needed for future backend) ├── components/ │ ├── exam/ │ │ ├── QuestionCard.tsx │ │ ├── FeedbackPanel.tsx │ │ ├── ProgressBar.tsx │ │ └── NavigationButtons.tsx │ ├── ui/ (reusable components) │ └── layout/ ├── lib/ │ ├── types.ts (TypeScript interfaces) │ ├── data.ts (exam data loader) │ └── utils.ts ├── hooks/ │ ├── useExamState.ts │ ├── useLocalStorage.ts │ └── useKeyboardNavigation.ts └── stores/ └── examStore.ts


### **Key Features to Implement:**

#### **1. Data Management:**
- Create TypeScript interfaces matching existing question structure
- Implement data loader for JSON exam data
- Add data validation and error handling

#### **2. State Management:**
- Global exam state with Zustand/Redux
- Persist state to localStorage automatically
- Handle multiple concurrent exam sessions

#### **3. Routing & Navigation:**
- `/` - Test selection page
- `/exam/[examId]/setup` - Topic selection and configuration
- `/exam/[examId]/practice` - Main exam interface
- Implement proper navigation guards and state persistence

#### **4. Components Architecture:**
- **ExamCard** - Display available exams
- **TopicSelector** - Multi-select topic filtering
- **QuestionDisplay** - Handle single/multiple choice rendering
- **AnswerOption** - Interactive answer selection
- **FeedbackPanel** - Show explanations and reasoning
- **ProgressTracker** - Visual progress and statistics
- **ResumeDialog** - Handle session continuation

#### **5. Enhanced Features:**
- Add search/filter functionality for questions
- Implement keyboard shortcuts (maintain existing ones)
- Add dark mode support
- Include print/export functionality for results
- Add performance analytics (time per question, etc.)

#### **6. Data Structure (TypeScript):**
```typescript
interface Question {
  id: number;
  topic: string;
  module: string;
  category: string;
  type: 'single' | 'multiple';
  question: string;
  options: string[];
  correct: number | number[];
  explanation: string;
  reasoning: {
    correct: string;
    why_others_wrong: Record<string, string>;
  };
  reference: {
    title: string;
    url: string;
  };
}

interface ExamSession {
  examId: string;
  selectedTopics: string[];
  questionLimit?: number;
  currentQuestionIndex: number;
  userAnswers: Record<number, number | number[]>;
  checkedQuestions: Set<number>;
  startTime: Date;
  lastActivity: Date;
}
7. Performance Optimizations:
Implement React.memo for question components
Use dynamic imports for large exam data
Add loading states and skeleton screens
Optimize bundle size with code splitting
8. Accessibility:
Add proper ARIA labels and roles
Implement focus management
Ensure keyboard navigation works perfectly
Add screen reader support
9. Additional Enhancements:
Add user preferences (theme, default topics, etc.)
Implement exam analytics and insights
Add social sharing for achievements
Include study reminders and scheduling
Add question bookmarking feature
10. Testing:
Unit tests for utility functions
Component testing with React Testing Library
E2E tests for critical user flows
Performance testing for large question sets
Migration Strategy:
Set up Next.js project with TypeScript and Tailwind
Convert existing data structure to TypeScript interfaces
Create reusable UI components
Implement state management with persistence
Build routing and navigation
Add enhanced features and optimizations
Implement comprehensive testing
Success Criteria:
✅ All existing functionality preserved
✅ Improved performance and user experience
✅ Type safety throughout the application
✅ Mobile-responsive design
✅ Accessibility compliance
✅ Easy to extend with new exams/features
✅ Production-ready deployment configuration
Please create a modern, scalable, and maintainable Next.js application that enhances the current functionality while maintaining the core user experience.

