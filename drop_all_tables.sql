-- Drop all tables in the correct order to avoid foreign key constraint issues
-- Run this in your Supabase SQL Editor before running the updated schema

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS pinned_stories CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS squads CASCADE;
DROP TABLE IF EXISTS deployment_links CASCADE;
DROP TABLE IF EXISTS gitlab_settings CASCADE;
DROP TABLE IF EXISTS slack_settings CASCADE;
DROP TABLE IF EXISTS jira_settings CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Drop any functions that might reference these tables
DROP FUNCTION IF EXISTS get_user_roles(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS has_role(VARCHAR, VARCHAR) CASCADE;

-- Drop any indexes (they will be recreated)
-- Note: Indexes are automatically dropped when tables are dropped

COMMIT; 