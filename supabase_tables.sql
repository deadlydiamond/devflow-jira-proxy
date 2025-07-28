-- Supabase Database Tables for DevFlow Application
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jira Settings table
CREATE TABLE jira_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500),
  url VARCHAR(255),
  email VARCHAR(255),
  selected_project VARCHAR(255),
  selected_board VARCHAR(255),
  selected_sprint VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Slack Settings table
CREATE TABLE slack_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500),
  channel_id VARCHAR(255),
  socket_token VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GitLab Settings table
CREATE TABLE gitlab_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500),
  url VARCHAR(255),
  project_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deployment Links table
CREATE TABLE deployment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticket_id VARCHAR(255),
  deployment_url VARCHAR(500),
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Squads table
CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  lead_id UUID,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  squad_id UUID REFERENCES squads(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pinned Stories table
CREATE TABLE pinned_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  story_key VARCHAR(255),
  story_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  theme VARCHAR(10) DEFAULT 'dark',
  openai_token VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gitlab_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can make this more secure later)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on jira_settings" ON jira_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on slack_settings" ON slack_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on gitlab_settings" ON gitlab_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on deployment_links" ON deployment_links FOR ALL USING (true);
CREATE POLICY "Allow all operations on squads" ON squads FOR ALL USING (true);
CREATE POLICY "Allow all operations on team_members" ON team_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on pinned_stories" ON pinned_stories FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_preferences" ON user_preferences FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_jira_settings_user_id ON jira_settings(user_id);
CREATE INDEX idx_slack_settings_user_id ON slack_settings(user_id);
CREATE INDEX idx_gitlab_settings_user_id ON gitlab_settings(user_id);
CREATE INDEX idx_deployment_links_user_id ON deployment_links(user_id);
CREATE INDEX idx_squads_user_id ON squads(user_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_squad_id ON team_members(squad_id);
CREATE INDEX idx_pinned_stories_user_id ON pinned_stories(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Insert a default user for testing
INSERT INTO users (email, name) VALUES ('test@example.com', 'Test User') ON CONFLICT (email) DO NOTHING;

-- Insert some sample data for testing
INSERT INTO squads (user_id, name, description, color, is_active) 
SELECT id, 'Frontend Team', 'Responsible for UI/UX development', '#3B82F6', true 
FROM users WHERE email = 'test@example.com';

INSERT INTO squads (user_id, name, description, color, is_active) 
SELECT id, 'Backend Team', 'Responsible for API and database development', '#10B981', true 
FROM users WHERE email = 'test@example.com';

INSERT INTO team_members (user_id, name, email, role, is_active) 
SELECT id, 'John Doe', 'john@example.com', 'Frontend Developer', true 
FROM users WHERE email = 'test@example.com';

INSERT INTO team_members (user_id, name, email, role, is_active) 
SELECT id, 'Jane Smith', 'jane@example.com', 'Backend Developer', true 
FROM users WHERE email = 'test@example.com';

-- Assign team members to squads
UPDATE team_members 
SET squad_id = (SELECT id FROM squads WHERE name = 'Frontend Team' LIMIT 1)
WHERE name = 'John Doe';

UPDATE team_members 
SET squad_id = (SELECT id FROM squads WHERE name = 'Backend Team' LIMIT 1)
WHERE name = 'Jane Smith';

-- Insert sample user preferences
INSERT INTO user_preferences (user_id, theme, openai_token) 
SELECT id, 'dark', 'your-openai-token-here' 
FROM users WHERE email = 'test@example.com';

COMMIT; 