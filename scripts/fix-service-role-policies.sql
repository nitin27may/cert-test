-- Fix service role policies to work correctly
-- Drop existing service role policies and recreate them

-- Drop existing service role policies
DROP POLICY IF EXISTS "Service role can manage exams" ON exams;
DROP POLICY IF EXISTS "Service role can manage topics" ON topics;
DROP POLICY IF EXISTS "Service role can manage topic_modules" ON topic_modules;
DROP POLICY IF EXISTS "Service role can manage questions" ON questions;
DROP POLICY IF EXISTS "Service role can manage certification_info" ON certification_info;

-- Create new policies that allow service role full access
-- Service role is identified by checking if auth.uid() is null (service role doesn't have a user ID)

-- For exams table
CREATE POLICY "Service role full access to exams" ON exams
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For topics table  
CREATE POLICY "Service role full access to topics" ON topics
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For topic_modules table
CREATE POLICY "Service role full access to topic_modules" ON topic_modules
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For questions table
CREATE POLICY "Service role full access to questions" ON questions
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For certification_info table
CREATE POLICY "Service role full access to certification_info" ON certification_info
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Alternative approach: Create policies that check JWT role claim
-- This is more explicit and works with authenticated service role usage

CREATE POLICY "Authenticated service role can manage exams" ON exams
  FOR ALL 
  USING (
    auth.jwt() ->> 'role' = 'service_role' 
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' 
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- You can apply similar policies to other tables if needed
