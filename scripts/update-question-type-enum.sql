-- Update the question_type enum to include 'case-study'
-- This script handles the case where the enum already exists

-- First, check if we need to add the new value
DO $$ 
BEGIN
    -- Check if 'case-study' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'case-study' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'question_type')
    ) THEN
        -- Add the new value to the enum
        ALTER TYPE question_type ADD VALUE 'case-study';
    END IF;
END $$;
