-- Updated Supabase Database Tables for DevFlow Application with RBAC
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles table for RBAC
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (updated)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255), -- For local authentication
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles junction table for many-to-many relationship
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
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
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gitlab_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can make this more secure later)
CREATE POLICY "Allow all operations on roles" ON roles FOR ALL USING (true);
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_roles" ON user_roles FOR ALL USING (true);
CREATE POLICY "Allow all operations on jira_settings" ON jira_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on slack_settings" ON slack_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on gitlab_settings" ON gitlab_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on deployment_links" ON deployment_links FOR ALL USING (true);
CREATE POLICY "Allow all operations on squads" ON squads FOR ALL USING (true);
CREATE POLICY "Allow all operations on team_members" ON team_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on pinned_stories" ON pinned_stories FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_preferences" ON user_preferences FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_jira_settings_user_id ON jira_settings(user_id);
CREATE INDEX idx_slack_settings_user_id ON slack_settings(user_id);
CREATE INDEX idx_gitlab_settings_user_id ON gitlab_settings(user_id);
CREATE INDEX idx_deployment_links_user_id ON deployment_links(user_id);
CREATE INDEX idx_squads_user_id ON squads(user_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_squad_id ON team_members(squad_id);
CREATE INDEX idx_pinned_stories_user_id ON pinned_stories(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES 
('superadmin', 'Super Administrator with full access', '{"all": true}'),
('lead', 'Team Lead with management permissions', '{"manage_team": true, "view_reports": true, "manage_sprints": true}'),
('engineer', 'Software Engineer with development permissions', '{"view_sprints": true, "update_stories": true, "view_team": true}'),
('po', 'Product Owner with product management permissions', '{"manage_backlog": true, "prioritize_stories": true, "view_reports": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert demo users with roles
INSERT INTO users (email, name, password_hash) VALUES 
('admin@devflow.com', 'Super Admin', '$2a$10$dummy.hash.for.demo'), -- password123
('lead@devflow.com', 'Team Lead', '$2a$10$dummy.hash.for.demo'), -- password123
('engineer@devflow.com', 'Software Engineer', '$2a$10$dummy.hash.for.demo'), -- password123
('po@devflow.com', 'Product Owner', '$2a$10$dummy.hash.for.demo') -- password123
ON CONFLICT (email) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'admin@devflow.com' AND r.name = 'superadmin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'lead@devflow.com' AND r.name = 'lead'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'engineer@devflow.com' AND r.name = 'engineer'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'po@devflow.com' AND r.name = 'po'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert sample data for testing
INSERT INTO squads (user_id, name, description, color, is_active) 
SELECT id, 'Frontend Team', 'Responsible for UI/UX development', '#3B82F6', true 
FROM users WHERE email = 'admin@devflow.com';

INSERT INTO squads (user_id, name, description, color, is_active) 
SELECT id, 'Backend Team', 'Responsible for API and database development', '#10B981', true 
FROM users WHERE email = 'admin@devflow.com';

INSERT INTO team_members (user_id, name, email, role, is_active) 
SELECT id, 'John Doe', 'john@example.com', 'Frontend Developer', true 
FROM users WHERE email = 'admin@devflow.com';

INSERT INTO team_members (user_id, name, email, role, is_active) 
SELECT id, 'Jane Smith', 'jane@example.com', 'Backend Developer', true 
FROM users WHERE email = 'admin@devflow.com';

-- Assign team members to squads
UPDATE team_members 
SET squad_id = (SELECT id FROM squads WHERE name = 'Frontend Team' LIMIT 1)
WHERE name = 'John Doe';

UPDATE team_members 
SET squad_id = (SELECT id FROM squads WHERE name = 'Backend Team' LIMIT 1)
WHERE name = 'Jane Smith';

-- Insert sample user preferences for all demo users
INSERT INTO user_preferences (user_id, theme, openai_token) 
SELECT id, 'dark', 'your-openai-token-here' 
FROM users WHERE email IN ('admin@devflow.com', 'lead@devflow.com', 'engineer@devflow.com', 'po@devflow.com')
ON CONFLICT (user_id) DO NOTHING;

-- Create a function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_email VARCHAR)
RETURNS TABLE(role_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name
  FROM users u
  JOIN user_roles ur ON u.id = ur.user_id
  JOIN roles r ON ur.role_id = r.id
  WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user has role
CREATE OR REPLACE FUNCTION has_role(user_email VARCHAR, role_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.email = user_email AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT; 