# Supabase Free Database Setup Guide

## 🆓 **100% Free PostgreSQL Backend**

### Step 1: Create Supabase Account (Free)
1. Go to [supabase.com](https://supabase.com)
2. Sign up for **free account** (no credit card required)
3. Create a new project
4. Get your project URL and anon key

### Step 2: Set Environment Variables
Add these to your Vercel environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Create Database Tables
Run these SQL commands in your Supabase SQL editor:

```sql
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
  name VARCHAR(255),
  description TEXT,
  lead_id UUID,
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(100),
  avatar_url VARCHAR(500),
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
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON jira_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON slack_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON gitlab_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON deployment_links FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON squads FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON team_members FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON pinned_stories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON user_preferences FOR ALL USING (true);
```

### Step 4: Deploy to Vercel
```bash
# Install dependencies
npm install

# Deploy to Vercel
vercel --prod
```

### Step 5: Test the Database
Your database API will be available at:
- `https://your-app.vercel.app/api/supabase-database`

## ⚡ **Performance Benefits**

- **Sub-100ms response times** with Supabase
- **Real-time subscriptions** - instant updates
- **Auto-generated APIs** - no manual setup
- **500MB database** - plenty for your app
- **No credit card required** - truly free

## 🆓 **Free Tier Limits**

Supabase Free Tier includes:
- 500MB database
- 2GB bandwidth
- 50MB file storage
- 50,000 monthly active users
- Real-time subscriptions
- Auto-generated APIs

## 🔄 **Migration from localStorage**

The new `DatabaseService` replaces localStorage with PostgreSQL:

### Before (localStorage):
```typescript
// Old way
this.localStorage.set('jira_token', token);
const token = this.localStorage.get('jira_token');
```

### After (PostgreSQL):
```typescript
// New way
this.databaseService.createJiraSettings({ token }).subscribe();
this.databaseService.getJiraSettings().subscribe(settings => {
  const token = settings?.token;
});
```

## 🎯 **Next Steps**

1. **Create Supabase account** (free)
2. **Set environment variables** in Vercel
3. **Create database tables** in Supabase
4. **Deploy to Vercel**
5. **Test the API** endpoints
6. **Update your Angular services** to use `DatabaseService`

## 🚀 **Why Supabase is Better**

- **PostgreSQL** - more powerful than MySQL
- **Real-time** - instant updates across devices
- **Auto-generated APIs** - no manual coding
- **Built-in auth** - ready for user authentication
- **Completely free** - no hidden costs 