-- Row Level Security Policies for Exam System
-- This file contains comprehensive RLS policies for data protection and access control

-- =====================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================================

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

-- =====================================================================
-- CREATE CUSTOM FUNCTIONS FOR RLS
-- =====================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has admin role in auth.users metadata
  -- This would be customized based on your admin role implementation
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is content manager
CREATE OR REPLACE FUNCTION is_content_manager(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND (
      raw_user_meta_data->>'role' = 'admin' OR 
      raw_user_meta_data->>'role' = 'content_manager'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- EXAM CONTENT POLICIES (Public Read Access)
-- =====================================================================

-- EXAMS table policies
CREATE POLICY "Public read access for active exams" ON exams
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Content managers can manage exams" ON exams
  FOR ALL 
  USING (is_content_manager(auth.uid()));

CREATE POLICY "Service role can manage exams" ON exams
  FOR ALL 
  USING (auth.role() = 'service_role');

-- TOPICS table policies
CREATE POLICY "Public read access for topics" ON topics
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM exams 
      WHERE exams.id = topics.exam_id 
      AND exams.is_active = true
    )
  );

CREATE POLICY "Content managers can manage topics" ON topics
  FOR ALL 
  USING (is_content_manager(auth.uid()));

CREATE POLICY "Service role can manage topics" ON topics
  FOR ALL 
  USING (auth.role() = 'service_role');

-- TOPIC_MODULES table policies
CREATE POLICY "Public read access for topic modules" ON topic_modules
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM topics 
      JOIN exams ON exams.id = topics.exam_id
      WHERE topics.id = topic_modules.topic_id 
      AND exams.is_active = true
    )
  );

CREATE POLICY "Content managers can manage topic modules" ON topic_modules
  FOR ALL 
  USING (is_content_manager(auth.uid()));

CREATE POLICY "Service role can manage topic modules" ON topic_modules
  FOR ALL 
  USING (auth.role() = 'service_role');

-- QUESTIONS table policies
CREATE POLICY "Public read access for active questions" ON questions
  FOR SELECT 
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM exams 
      WHERE exams.id = questions.exam_id 
      AND exams.is_active = true
    )
  );

CREATE POLICY "Content managers can manage questions" ON questions
  FOR ALL 
  USING (is_content_manager(auth.uid()));

CREATE POLICY "Service role can manage questions" ON questions
  FOR ALL 
  USING (auth.role() = 'service_role');

-- CERTIFICATION_INFO table policies
CREATE POLICY "Public read access for certification info" ON certification_info
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM exams 
      WHERE exams.id = certification_info.exam_id 
      AND exams.is_active = true
    )
  );

CREATE POLICY "Content managers can manage certification info" ON certification_info
  FOR ALL 
  USING (is_content_manager(auth.uid()));

CREATE POLICY "Service role can manage certification info" ON certification_info
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- USER DATA POLICIES (User-specific Access)
-- =====================================================================

-- USER_EXAM_SESSIONS table policies
CREATE POLICY "Users can view their own exam sessions" ON user_exam_sessions
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exam sessions" ON user_exam_sessions
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam sessions" ON user_exam_sessions
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all sessions for monitoring
CREATE POLICY "Admins can view all exam sessions" ON user_exam_sessions
  FOR SELECT 
  USING (is_admin(auth.uid()));

-- Service role can manage all sessions
CREATE POLICY "Service role can manage exam sessions" ON user_exam_sessions
  FOR ALL 
  USING (auth.role() = 'service_role');

-- SESSION_QUESTIONS table policies
CREATE POLICY "Users can view their session questions" ON session_questions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_exam_sessions 
      WHERE user_exam_sessions.id = session_questions.session_id 
      AND user_exam_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their session questions" ON session_questions
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_exam_sessions 
      WHERE user_exam_sessions.id = session_questions.session_id 
      AND user_exam_sessions.user_id = auth.uid()
    )
  );

-- Service role can manage all session questions
CREATE POLICY "Service role can manage session questions" ON session_questions
  FOR ALL 
  USING (auth.role() = 'service_role');

-- USER_ANSWERS table policies
CREATE POLICY "Users can view their own answers" ON user_answers
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_exam_sessions 
      WHERE user_exam_sessions.id = user_answers.session_id 
      AND user_exam_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own answers" ON user_answers
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_exam_sessions 
      WHERE user_exam_sessions.id = user_answers.session_id 
      AND user_exam_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own answers" ON user_answers
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_exam_sessions 
      WHERE user_exam_sessions.id = user_answers.session_id 
      AND user_exam_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_exam_sessions 
      WHERE user_exam_sessions.id = user_answers.session_id 
      AND user_exam_sessions.user_id = auth.uid()
    )
  );

-- Prevent deletion of answers to maintain data integrity
CREATE POLICY "Prevent deletion of user answers" ON user_answers
  FOR DELETE 
  USING (false);

-- Service role can manage all user answers
CREATE POLICY "Service role can manage user answers" ON user_answers
  FOR ALL 
  USING (auth.role() = 'service_role');

-- EXAM_RESULTS table policies
CREATE POLICY "Users can view their own exam results" ON exam_results
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Only system can create exam results (when completing sessions)
CREATE POLICY "System can create exam results" ON exam_results
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Prevent users from updating or deleting results
CREATE POLICY "Prevent modification of exam results" ON exam_results
  FOR UPDATE 
  USING (false);

CREATE POLICY "Prevent deletion of exam results" ON exam_results
  FOR DELETE 
  USING (false);

-- Admins can view all results for analytics
CREATE POLICY "Admins can view all exam results" ON exam_results
  FOR SELECT 
  USING (is_admin(auth.uid()));

-- Service role can manage all exam results
CREATE POLICY "Service role can manage exam results" ON exam_results
  FOR ALL 
  USING (auth.role() = 'service_role');

-- USER_PREFERENCES table policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" ON user_preferences
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Service role can manage all user preferences
CREATE POLICY "Service role can manage user preferences" ON user_preferences
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- ADDITIONAL SECURITY POLICIES
-- =====================================================================

-- Prevent unauthorized table access
CREATE POLICY "Authenticated users only" ON exams
  FOR ALL 
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users only" ON topics
  FOR ALL 
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users only" ON questions
  FOR ALL 
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Time-based access restrictions (optional)
-- Example: Restrict exam access during maintenance windows
CREATE OR REPLACE FUNCTION is_maintenance_window()
RETURNS BOOLEAN AS $$
BEGIN
  -- Example: Block access between 2-4 AM UTC for maintenance
  RETURN EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC') BETWEEN 2 AND 4;
END;
$$ LANGUAGE plpgsql;

-- Apply maintenance window restrictions to critical operations
CREATE POLICY "Block sessions during maintenance" ON user_exam_sessions
  FOR INSERT 
  WITH CHECK (NOT is_maintenance_window());

-- =====================================================================
-- AUDIT AND MONITORING POLICIES
-- =====================================================================

-- Create audit log table (optional)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log sensitive operations
CREATE OR REPLACE FUNCTION log_sensitive_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log operations on sensitive tables
  IF TG_TABLE_NAME IN ('user_answers', 'exam_results', 'user_exam_sessions') THEN
    INSERT INTO audit_log (
      table_name,
      operation,
      user_id,
      record_id,
      old_data,
      new_data
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      auth.uid(),
      COALESCE(NEW.id::TEXT, OLD.id::TEXT),
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers
CREATE TRIGGER audit_user_answers
  AFTER INSERT OR UPDATE OR DELETE ON user_answers
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();

CREATE TRIGGER audit_exam_results
  AFTER INSERT OR UPDATE OR DELETE ON exam_results
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();

CREATE TRIGGER audit_user_sessions
  AFTER INSERT OR UPDATE OR DELETE ON user_exam_sessions
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();

-- RLS for audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit log" ON audit_log
  FOR SELECT 
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit log" ON audit_log
  FOR INSERT 
  WITH CHECK (true);

-- =====================================================================
-- PERFORMANCE AND RATE LIMITING
-- =====================================================================

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, action)
);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  action_name TEXT,
  max_requests INTEGER,
  window_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current rate limit data
  SELECT count, rate_limits.window_start INTO current_count, window_start
  FROM rate_limits 
  WHERE user_id = auth.uid() AND action = action_name;
  
  -- If no record exists or window expired, reset
  IF current_count IS NULL OR NOW() - window_start > INTERVAL '1 minute' * window_minutes THEN
    INSERT INTO rate_limits (user_id, action, count, window_start)
    VALUES (auth.uid(), action_name, 1, NOW())
    ON CONFLICT (user_id, action) 
    DO UPDATE SET count = 1, window_start = NOW();
    RETURN true;
  END IF;
  
  -- Check if under limit
  IF current_count < max_requests THEN
    UPDATE rate_limits 
    SET count = count + 1 
    WHERE user_id = auth.uid() AND action = action_name;
    RETURN true;
  END IF;
  
  -- Rate limit exceeded
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply rate limiting to session creation
CREATE POLICY "Rate limit session creation" ON user_exam_sessions
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND 
    check_rate_limit('create_session', 10, 60) -- Max 10 sessions per hour
  );

-- Apply rate limiting to answer submission
CREATE POLICY "Rate limit answer submission" ON user_answers
  FOR INSERT 
  WITH CHECK (
    check_rate_limit('submit_answer', 1000, 60) -- Max 1000 answers per hour
  );

-- =====================================================================
-- CLEANUP AND MAINTENANCE
-- =====================================================================

-- Function to cleanup old rate limit data
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log 
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON POLICY "Public read access for active exams" ON exams IS 
'Allows anonymous and authenticated users to read active exam metadata';

COMMENT ON POLICY "Users can view their own exam sessions" ON user_exam_sessions IS 
'Users can only access their own exam sessions for privacy';

COMMENT ON POLICY "System can create exam results" ON exam_results IS 
'Only the system service role can create exam results to prevent manipulation';

COMMENT ON FUNCTION is_admin(UUID) IS 
'Checks if a user has admin role based on auth.users metadata';

COMMENT ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) IS 
'Implements rate limiting to prevent abuse of API endpoints';

-- =====================================================================
-- GRANTS AND PERMISSIONS
-- =====================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON exams TO authenticated;
GRANT SELECT ON topics TO authenticated;
GRANT SELECT ON topic_modules TO authenticated;
GRANT SELECT ON questions TO authenticated;
GRANT SELECT ON certification_info TO authenticated;

-- Grant full access to user-specific tables
GRANT ALL ON user_exam_sessions TO authenticated;
GRANT ALL ON session_questions TO authenticated;
GRANT ALL ON user_answers TO authenticated;
GRANT SELECT ON exam_results TO authenticated;
GRANT ALL ON user_preferences TO authenticated;

-- Grant access to sequence objects
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;