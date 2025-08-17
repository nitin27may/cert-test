-- Add additional time tracking columns for better pause/resume functionality
-- This migration adds columns to track pause/resume cycles and total active time

-- Add columns to track pause/resume cycles
ALTER TABLE user_exam_sessions 
ADD COLUMN IF NOT EXISTS total_pause_time_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_pause_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0;

-- Add column to track when time tracking was last started/resumed
ALTER TABLE user_exam_sessions 
ADD COLUMN IF NOT EXISTS time_tracking_started_at TIMESTAMP WITH TIME ZONE;

-- Add column to track if time tracking is currently active
ALTER TABLE user_exam_sessions 
ADD COLUMN IF NOT EXISTS is_time_tracking_active BOOLEAN DEFAULT false;

-- Create index for better performance on time-related queries
CREATE INDEX IF NOT EXISTS idx_user_exam_sessions_time_tracking 
ON user_exam_sessions(time_spent_seconds, is_time_tracking_active, last_activity);

-- Add comment to explain the new columns
COMMENT ON COLUMN user_exam_sessions.total_pause_time_seconds IS 'Total time spent in paused state across all pause/resume cycles';
COMMENT ON COLUMN user_exam_sessions.last_pause_time IS 'Timestamp when the session was last paused';
COMMENT ON COLUMN user_exam_sessions.pause_count IS 'Number of times the session has been paused';
COMMENT ON COLUMN user_exam_sessions.time_tracking_started_at IS 'Timestamp when time tracking was last started/resumed';
COMMENT ON COLUMN user_exam_sessions.is_time_tracking_active IS 'Whether time tracking is currently active (true) or paused (false)';
