-- Supabase Database Schema for Exam System
-- This schema migrates exam.json data to a proper relational structure

-- Create custom types (with checks to avoid errors if they already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_difficulty') THEN
        CREATE TYPE exam_difficulty AS ENUM ('easy', 'medium', 'difficult');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        CREATE TYPE question_type AS ENUM ('single', 'multiple', 'case-study');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
        CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'paused', 'abandoned');
    END IF;
END $$;

-- 1. EXAMS table - stores exam metadata
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  networking_focus_percentage DECIMAL(5,2),
  certification_guide_url TEXT,
  study_guide_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 2. TOPICS table - stores exam topics/domains
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight TEXT, -- e.g., "15-20%"
  weightage DECIMAL(5,2), -- numerical weight for calculations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TOPIC_MODULES table - stores modules within topics
CREATE TABLE IF NOT EXISTS topic_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. QUESTIONS table - stores all exam questions
CREATE TABLE IF NOT EXISTS questions (
  id BIGINT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  module TEXT,
  category TEXT,
  type question_type NOT NULL,
  difficulty exam_difficulty NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of option strings
  correct_answers JSONB NOT NULL, -- Array of correct answer indices
  explanation TEXT,
  reasoning JSONB, -- Store reasoning object
  reference JSONB, -- Store reference object with title and URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 5. CERTIFICATION_INFO table - stores certification details
CREATE TABLE IF NOT EXISTS certification_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  exam_code TEXT,
  level TEXT,
  validity TEXT,
  prerequisites JSONB, -- Array of prerequisites
  skills_measured JSONB, -- Array of skill objects
  study_resources JSONB, -- Array of resource objects
  exam_details JSONB, -- Object with duration, questions, cost, etc.
  career_path JSONB, -- Array of career paths
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. USER_EXAM_SESSIONS table - tracks user exam attempts
CREATE TABLE IF NOT EXISTS user_exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  session_name TEXT, -- Optional custom name for the session
  selected_topics JSONB, -- Array of selected topic IDs
  question_limit INTEGER,
  current_question_index INTEGER DEFAULT 0,
  status session_status DEFAULT 'in_progress',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_questions INTEGER NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score DECIMAL(5,2), -- Final score percentage
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. SESSION_QUESTIONS table - tracks which questions are in each session
CREATE TABLE IF NOT EXISTS session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES user_exam_sessions(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, question_id),
  UNIQUE(session_id, question_order)
);

-- 8. USER_ANSWERS table - stores user responses to questions
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES user_exam_sessions(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer JSONB NOT NULL, -- Array of selected answer indices
  is_correct BOOLEAN,
  is_flagged BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

-- 9. EXAM_RESULTS table - stores final exam results and statistics
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES user_exam_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  incorrect_answers INTEGER NOT NULL,
  unanswered_questions INTEGER DEFAULT 0,
  score_percentage DECIMAL(5,2) NOT NULL,
  pass_status BOOLEAN, -- true if passed, false if failed, null if no pass criteria
  time_spent_seconds INTEGER NOT NULL,
  average_time_per_question DECIMAL(8,2),
  topic_scores JSONB, -- Breakdown by topic
  difficulty_scores JSONB, -- Breakdown by difficulty
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. USER_PREFERENCES table - stores user settings and preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  default_topics JSONB, -- Array of preferred topic IDs
  keyboard_navigation BOOLEAN DEFAULT true,
  show_detailed_explanations BOOLEAN DEFAULT true,
  auto_save_interval_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topics_exam_id ON topics(exam_id);
CREATE INDEX IF NOT EXISTS idx_topic_modules_topic_id ON topic_modules(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_exam_sessions_user_id ON user_exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exam_sessions_exam_id ON user_exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_user_exam_sessions_status ON user_exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_exam_sessions_last_activity ON user_exam_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_session_questions_session_id ON session_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_questions_question_id ON session_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_session_id ON user_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_completed_at ON exam_results(completed_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certification_info_updated_at BEFORE UPDATE ON certification_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_exam_sessions_updated_at BEFORE UPDATE ON user_exam_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_answers_updated_at BEFORE UPDATE ON user_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Public read access for exam content (exams, topics, questions, etc.)
CREATE POLICY "Public read access for exams" ON exams FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read access for topic_modules" ON topic_modules FOR SELECT USING (true);
CREATE POLICY "Public read access for questions" ON questions FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for certification_info" ON certification_info FOR SELECT USING (true);

-- User-specific policies for sessions, answers, results, and preferences
CREATE POLICY "Users can manage their own exam sessions" ON user_exam_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own session questions" ON session_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_exam_sessions ues 
      WHERE ues.id = session_questions.session_id 
      AND ues.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own answers" ON user_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_exam_sessions ues 
      WHERE ues.id = user_answers.session_id 
      AND ues.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own exam results" ON exam_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert exam results" ON exam_results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Admin policies (for content management)
-- Note: In production, you might want to create a proper admin role
CREATE POLICY "Service role can manage exams" ON exams
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage topics" ON topics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage topic_modules" ON topic_modules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage questions" ON questions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage certification_info" ON certification_info
  FOR ALL USING (auth.role() = 'service_role');