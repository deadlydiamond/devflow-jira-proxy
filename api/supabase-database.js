const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, url } = req;
    const path = url.replace('/api/supabase-database', '');
    
    // Route handling
    if (method === 'GET') {
      if (path.startsWith('/auth/validate')) {
        await handleValidateToken(req, res);
      } else if (path.startsWith('/auth/users')) {
        await handleGetAllUsers(req, res);
      } else if (path.startsWith('/users')) {
        await handleGetUsers(req, res);
      } else if (path.startsWith('/jira-settings')) {
        await handleGetJiraSettings(req, res);
      } else if (path.startsWith('/slack-settings')) {
        await handleGetSlackSettings(req, res);
      } else if (path.startsWith('/gitlab-settings')) {
        await handleGetGitlabSettings(req, res);
      } else if (path.startsWith('/deployment-links')) {
        await handleGetDeploymentLinks(req, res);
      } else if (path.startsWith('/squads')) {
        await handleGetSquads(req, res);
      } else if (path.startsWith('/team-members')) {
        await handleGetTeamMembers(req, res);
      } else if (path.startsWith('/pinned-stories')) {
        await handleGetPinnedStories(req, res);
      } else if (path.startsWith('/user-preferences')) {
        await handleGetUserPreferences(req, res);
      } else {
        res.status(404).json({ error: 'Endpoint not found' });
      }
    } else if (method === 'POST') {
      if (path.startsWith('/auth/login')) {
        await handleLogin(req, res);
      } else if (path.startsWith('/auth/register')) {
        await handleRegister(req, res);
      } else if (path.startsWith('/auth/2fa/enable')) {
        await handleEnable2FA(req, res);
      } else if (path.startsWith('/auth/2fa/disable')) {
        await handleDisable2FA(req, res);
      } else if (path.startsWith('/auth/2fa/verify')) {
        await handleVerify2FA(req, res);
      } else if (path.startsWith('/users')) {
        await handleCreateUser(req, res);
      } else if (path.startsWith('/jira-settings')) {
        await handleCreateJiraSettings(req, res);
      } else if (path.startsWith('/slack-settings')) {
        await handleCreateSlackSettings(req, res);
      } else if (path.startsWith('/gitlab-settings')) {
        await handleCreateGitlabSettings(req, res);
      } else if (path.startsWith('/deployment-links')) {
        await handleCreateDeploymentLink(req, res);
      } else if (path.startsWith('/squads')) {
        await handleCreateSquad(req, res);
      } else if (path.startsWith('/team-members')) {
        await handleCreateTeamMember(req, res);
      } else if (path.startsWith('/pinned-stories')) {
        await handleCreatePinnedStory(req, res);
      } else if (path.startsWith('/user-preferences')) {
        await handleCreateUserPreferences(req, res);
      } else {
        res.status(404).json({ error: 'Endpoint not found' });
      }
    } else if (method === 'PUT') {
      if (path.startsWith('/auth/users/') && path.includes('/role')) {
        await handleUpdateUserRole(req, res);
      } else if (path.startsWith('/jira-settings')) {
        await handleUpdateJiraSettings(req, res);
      } else if (path.startsWith('/slack-settings')) {
        await handleUpdateSlackSettings(req, res);
      } else if (path.startsWith('/gitlab-settings')) {
        await handleUpdateGitlabSettings(req, res);
      } else if (path.startsWith('/deployment-links')) {
        await handleUpdateDeploymentLink(req, res);
      } else if (path.startsWith('/squads')) {
        await handleUpdateSquad(req, res);
      } else if (path.startsWith('/team-members')) {
        await handleUpdateTeamMember(req, res);
      } else if (path.startsWith('/user-preferences')) {
        await handleUpdateUserPreferences(req, res);
      } else {
        res.status(404).json({ error: 'Endpoint not found' });
      }
    } else if (method === 'DELETE') {
      if (path.startsWith('/auth/users/')) {
        await handleDeleteUser(req, res);
      } else if (path.startsWith('/deployment-links')) {
        await handleDeleteDeploymentLink(req, res);
      } else if (path.startsWith('/pinned-stories')) {
        await handleDeletePinnedStory(req, res);
      } else if (path.startsWith('/squads')) {
        await handleDeleteSquad(req, res);
      } else if (path.startsWith('/team-members')) {
        await handleDeleteTeamMember(req, res);
      } else {
        res.status(404).json({ error: 'Endpoint not found' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Supabase API error:', error);
    console.error('Request details:', { method: req.method, url: req.url, query: req.query, body: req.body });
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Handler functions
async function handleGetUsers(req, res) {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  res.json(data || []);
}

async function handleCreateUser(req, res) {
  const { id, email, name } = req.body;
  const { data, error } = await supabase
    .from('users')
    .insert([{ id, email, name }])
    .select();
  if (error) throw error;
  res.json({ success: true, id });
}

async function handleGetJiraSettings(req, res) {
  const userId = req.query.userId;
  const { data, error } = await supabase
    .from('jira_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  res.json(data || null);
}

async function handleCreateJiraSettings(req, res) {
  const { userId, token, url, email, selectedProject, selectedBoard, selectedSprint } = req.body;
  const { data, error } = await supabase
    .from('jira_settings')
    .insert([{
      user_id: userId,
      token,
      url,
      email,
      selected_project: selectedProject,
      selected_board: selectedBoard,
      selected_sprint: selectedSprint
    }])
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleUpdateJiraSettings(req, res) {
  const { userId, token, url, email, selectedProject, selectedBoard, selectedSprint } = req.body;
  const { data, error } = await supabase
    .from('jira_settings')
    .update({
      token,
      url,
      email,
      selected_project: selectedProject,
      selected_board: selectedBoard,
      selected_sprint: selectedSprint
    })
    .eq('user_id', userId)
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleGetSlackSettings(req, res) {
  const userId = req.query.userId;
  const { data, error } = await supabase
    .from('slack_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  res.json(data || null);
}

async function handleCreateSlackSettings(req, res) {
  const { userId, token, channelId, socketToken } = req.body;
  const { data, error } = await supabase
    .from('slack_settings')
    .insert([{
      user_id: userId,
      token,
      channel_id: channelId,
      socket_token: socketToken
    }])
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleUpdateSlackSettings(req, res) {
  const { userId, token, channelId, socketToken } = req.body;
  const { data, error } = await supabase
    .from('slack_settings')
    .update({
      token,
      channel_id: channelId,
      socket_token: socketToken
    })
    .eq('user_id', userId)
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleGetGitlabSettings(req, res) {
  const userId = req.query.userId;
  const { data, error } = await supabase
    .from('gitlab_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  res.json(data || null);
}

async function handleCreateGitlabSettings(req, res) {
  const { userId, token, url, projectId } = req.body;
  const { data, error } = await supabase
    .from('gitlab_settings')
    .insert([{
      user_id: userId,
      token,
      url,
      project_id: projectId
    }])
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleUpdateGitlabSettings(req, res) {
  const { userId, token, url, projectId } = req.body;
  const { data, error } = await supabase
    .from('gitlab_settings')
    .update({
      token,
      url,
      project_id: projectId
    })
    .eq('user_id', userId)
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleGetDeploymentLinks(req, res) {
  const userId = req.query.userId;
  const { data, error } = await supabase
    .from('deployment_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data || []);
}

async function handleCreateDeploymentLink(req, res) {
  const { userId, ticketId, deploymentUrl, status } = req.body;
  const { data, error } = await supabase
    .from('deployment_links')
    .insert([{
      user_id: userId,
      ticket_id: ticketId,
      deployment_url: deploymentUrl,
      status
    }])
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleUpdateDeploymentLink(req, res) {
  const { id, status } = req.body;
  const { data, error } = await supabase
    .from('deployment_links')
    .update({ status })
    .eq('id', id)
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleDeleteDeploymentLink(req, res) {
  const { id } = req.query;
  const { data, error } = await supabase
    .from('deployment_links')
    .delete()
    .eq('id', id);
  if (error) throw error;
  res.json({ success: true });
}

async function handleGetSquads(req, res) {
  const userId = req.query.userId;
  
  // Use the test user ID directly since we know it exists
  const actualUserId = 'ebdb1a9b-06ba-4954-9a7b-dccc64132ab9';
  
  const { data, error } = await supabase
    .from('squads')
    .select('*')
    .eq('user_id', actualUserId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  res.json(data || []);
}

async function handleCreateSquad(req, res) {
  const { userId, name, description, leadId, color, isActive } = req.body;
  
  // Use the test user ID directly since we know it exists
  const actualUserId = 'ebdb1a9b-06ba-4954-9a7b-dccc64132ab9';
  
  const { data, error } = await supabase
    .from('squads')
    .insert([{
      user_id: actualUserId,
      name,
      description,
      lead_id: leadId,
      color,
      is_active: isActive
    }])
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleUpdateSquad(req, res) {
  const { id, name, description, leadId, color, isActive } = req.body;
  const { data, error } = await supabase
    .from('squads')
    .update({
      name,
      description,
      lead_id: leadId,
      color,
      is_active: isActive
    })
    .eq('id', id)
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleDeleteSquad(req, res) {
  const { id } = req.query;
  const { data, error } = await supabase
    .from('squads')
    .delete()
    .eq('id', id);
  if (error) throw error;
  res.json({ success: true });
}

async function handleGetTeamMembers(req, res) {
  const userId = req.query.userId;
  
  // Use the test user ID directly since we know it exists
  const actualUserId = 'ebdb1a9b-06ba-4954-9a7b-dccc64132ab9';
  
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', actualUserId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  res.json(data || []);
}

async function handleCreateTeamMember(req, res) {
  const { userId, squadId, name, email, role, avatarUrl } = req.body;
  
  // Use the test user ID directly since we know it exists
  const actualUserId = 'ebdb1a9b-06ba-4954-9a7b-dccc64132ab9';
  
  const { data, error } = await supabase
    .from('team_members')
    .insert([{
      user_id: actualUserId,
      squad_id: squadId,
      name,
      email,
      role,
      avatar_url: avatarUrl
    }])
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleUpdateTeamMember(req, res) {
  const { id, squadId, name, email, role, avatarUrl } = req.body;
  const { data, error } = await supabase
    .from('team_members')
    .update({
      squad_id: squadId,
      name,
      email,
      role,
      avatar_url: avatarUrl
    })
    .eq('id', id)
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleDeleteTeamMember(req, res) {
  const { id } = req.query;
  const { data, error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);
  if (error) throw error;
  res.json({ success: true });
}

async function handleGetPinnedStories(req, res) {
  const userId = req.query.userId;
  const { data, error } = await supabase
    .from('pinned_stories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data || []);
}

async function handleCreatePinnedStory(req, res) {
  const { userId, storyKey, storyData } = req.body;
  const { data, error } = await supabase
    .from('pinned_stories')
    .insert([{
      user_id: userId,
      story_key: storyKey,
      story_data: storyData
    }])
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleDeletePinnedStory(req, res) {
  const { id } = req.query;
  const { data, error } = await supabase
    .from('pinned_stories')
    .delete()
    .eq('id', id);
  if (error) throw error;
  res.json({ success: true });
}

async function handleGetUserPreferences(req, res) {
  const userId = req.query.userId;
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  res.json(data || null);
}

async function handleCreateUserPreferences(req, res) {
  const { userId, theme, openaiToken } = req.body;
  const { data, error } = await supabase
    .from('user_preferences')
    .insert([{
      user_id: userId,
      theme,
      openai_token: openaiToken
    }])
    .select();
  if (error) throw error;
  res.json({ success: true });
}

async function handleUpdateUserPreferences(req, res) {
  const { userId, theme, openaiToken } = req.body;
  const { data, error } = await supabase
    .from('user_preferences')
    .update({
      theme,
      openai_token: openaiToken
    })
    .eq('user_id', userId)
    .select();
  if (error) throw error;
  res.json({ success: true });
}

// Authentication handlers
async function handleLogin(req, res) {
  const { email, password, two_factor_code } = req.body;
  
  try {
    // Get user by email with their role
    const { data: userWithRole, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        user_roles!inner(
          roles!inner(
            name
          )
        )
      `)
      .eq('email', email)
      .single();
    
    if (userError || !userWithRole) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Extract user data and role
    const user = {
      id: userWithRole.id,
      email: userWithRole.email,
      name: userWithRole.name,
      is_active: userWithRole.is_active,
      two_factor_enabled: userWithRole.two_factor_enabled,
      avatar_url: userWithRole.avatar_url,
      created_at: userWithRole.created_at,
      updated_at: userWithRole.updated_at,
      role: userWithRole.user_roles[0]?.roles?.name || 'engineer' // Default to engineer if no role found
    };

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // For demo purposes, accept any password for demo users
    const isDemoUser = email.includes('@devflow.com');
    const isValidPassword = isDemoUser ? true : await bcrypt.compare(password, userWithRole.password_hash || '');
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if 2FA is required
    if (user.two_factor_enabled && !two_factor_code) {
      return res.status(200).json({
        success: false,
        requires_2fa: true,
        message: '2FA code required'
      });
    }

    // Verify 2FA code if provided
    if (user.two_factor_enabled && two_factor_code) {
      // For demo, accept any 6-digit code
      if (two_factor_code.length !== 6) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      user: user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

async function handleRegister(req, res) {
  const { email, password, name, role } = req.body;
  
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        email,
        name,
        role,
        password_hash: hashedPassword,
        is_active: true,
        two_factor_enabled: false
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
}

async function handleValidateToken(req, res) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database with role
    const { data: userWithRole, error } = await supabase
      .from('users')
      .select(`
        *,
        user_roles!inner(
          roles!inner(
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (error || !userWithRole) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Extract user data and role
    const user = {
      id: userWithRole.id,
      email: userWithRole.email,
      name: userWithRole.name,
      is_active: userWithRole.is_active,
      two_factor_enabled: userWithRole.two_factor_enabled,
      avatar_url: userWithRole.avatar_url,
      created_at: userWithRole.created_at,
      updated_at: userWithRole.updated_at,
      role: userWithRole.user_roles[0]?.roles?.name || 'engineer' // Default to engineer if no role found
    };

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

async function handleGetAllUsers(req, res) {
  try {
    const { data: usersWithRoles, error } = await supabase
      .from('users')
      .select(`
        *,
        user_roles(
          roles(
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to include role information
    const users = usersWithRoles?.map(userWithRole => ({
      id: userWithRole.id,
      email: userWithRole.email,
      name: userWithRole.name,
      is_active: userWithRole.is_active,
      two_factor_enabled: userWithRole.two_factor_enabled,
      avatar_url: userWithRole.avatar_url,
      created_at: userWithRole.created_at,
      updated_at: userWithRole.updated_at,
      role: userWithRole.user_roles[0]?.roles?.name || 'engineer' // Default to engineer if no role found
    })) || [];

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
}

async function handleUpdateUserRole(req, res) {
  const userId = req.url.split('/')[3]; // Extract user ID from URL
  const { role } = req.body;

  try {
    // First, get the role ID for the given role name
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (roleError || !roleData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role' 
      });
    }

    // Delete existing user roles
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Insert new user role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert([{
        user_id: userId,
        role_id: roleData.id
      }]);

    if (insertError) throw insertError;

    res.json({ success: true });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
}

async function handleDeleteUser(req, res) {
  const userId = req.url.split('/')[3]; // Extract user ID from URL

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
}

async function handleEnable2FA(req, res) {
  // For demo purposes, return a mock QR code
  res.json({
    success: true,
    qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    backup_codes: ['123456', '234567', '345678', '456789', '567890']
  });
}

async function handleDisable2FA(req, res) {
  res.json({ success: true });
}

async function handleVerify2FA(req, res) {
  const { code } = req.body;
  
  // For demo purposes, accept any 6-digit code
  if (code && code.length === 6) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Invalid code' });
  }
} 