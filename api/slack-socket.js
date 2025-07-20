const { WebClient } = require('@slack/web-api');

// In-memory storage for events (in production, you'd use a database like Redis or MongoDB)
let recentEvents = [];
const MAX_EVENTS = 100;

// Store deployment tracking events separately
let deploymentEvents = [];
const MAX_DEPLOYMENT_EVENTS = 50;

// Connection status
let isConnected = false;
let lastPollTime = null;
let webClient = null;

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
    if (req.method === 'POST') {
      const { action, botToken, appToken } = req.body;
      
      if (action === 'connect') {
        const { botToken, appToken } = req.body;
        
        if (!botToken || !appToken) {
          return res.status(400).json({ 
            success: false, 
            error: 'Both botToken and appToken are required' 
          });
        }
        
        try {
          // Initialize Slack client with provided tokens
          webClient = new WebClient(botToken);
          
          // Test the connection by calling auth.test
          const authTest = await webClient.auth.test();
          
          if (!authTest.ok) {
            throw new Error(`Authentication failed: ${authTest.error}`);
          }
          
          console.log(`✅ Connected to Slack as @${authTest.user}`);
          isConnected = true;
          lastPollTime = new Date().toISOString();
          
          // Start initial polling
          try {
            await pollForNewEvents();
          } catch (pollError) {
            console.warn('Initial polling failed:', pollError);
            // Don't fail the connection if polling fails
          }
          
          res.status(200).json({ 
            success: true, 
            message: `Connected to Slack as @${authTest.user}`,
            user: authTest.user,
            team: authTest.team
          });
          
        } catch (error) {
          console.error('❌ Connection failed:', error);
          isConnected = false;
          webClient = null;
          res.status(500).json({ 
            success: false, 
            error: error.message 
          });
        }
        
      } else if (action === 'disconnect') {
        // Disconnect polling
        isConnected = false;
        lastPollTime = null;
        webClient = null;
        res.status(200).json({ success: true, message: 'Disconnected from Slack API' });
        
      } else if (action === 'status') {
        // Get connection status
        res.status(200).json({
          connected: isConnected,
          hasClient: !!webClient,
          recentEventsCount: recentEvents.length,
          deploymentEventsCount: deploymentEvents.length,
          lastPollTime: lastPollTime
        });
        
      } else if (action === 'poll') {
        // Manual polling trigger
        if (!isConnected || !webClient) {
          return res.status(400).json({ error: 'Not connected to Slack API' });
        }
        
        try {
          // Poll for new messages (this is a simplified example)
          // In a real implementation, you'd poll specific channels or use Slack's Events API
          const result = await pollForNewEvents();
          res.status(200).json({ success: true, eventsFound: result });
        } catch (error) {
          console.error('Polling error:', error);
          res.status(500).json({ error: error.message });
        }
        
      } else {
        // Handle incoming Slack events (fallback for webhook mode)
        const event = req.body;
        
        console.log('📨 Received Slack event via webhook:', JSON.stringify(event, null, 2));
        
        // Extract the actual Slack event
        let slackEvent = null;
        if (event.type === 'events_api' && event.body && event.body.event) {
          slackEvent = event.body.event;
        } else if (event.body && event.body.event) {
          slackEvent = event.body.event;
        } else if (event.type === 'message' || event.channel) {
          slackEvent = event;
        }
        
        if (slackEvent) {
          // Check if this is a deployment-related event
          const isDeploymentEvent = checkIfDeploymentEvent(slackEvent);
          
          const eventData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            event: slackEvent,
            type: slackEvent.type || 'unknown',
            source: 'webhook'
          };
          
          // Store in appropriate array
          if (isDeploymentEvent) {
            deploymentEvents.unshift(eventData);
            if (deploymentEvents.length > MAX_DEPLOYMENT_EVENTS) {
              deploymentEvents = deploymentEvents.slice(0, MAX_DEPLOYMENT_EVENTS);
            }
          } else {
            recentEvents.unshift(eventData);
            if (recentEvents.length > MAX_EVENTS) {
              recentEvents = recentEvents.slice(0, MAX_EVENTS);
            }
          }
          
          console.log(`✅ Stored ${isDeploymentEvent ? 'deployment' : 'general'} event via webhook`);
        }
        
        // Acknowledge the event
        res.status(200).json({ ok: true });
      }
      
    } else if (req.method === 'GET') {
      // Return events for Angular to poll
      const { since, type } = req.query;
      
      let events = [];
      
      // Determine which events to return
      if (type === 'deployment') {
        events = deploymentEvents;
      } else {
        events = recentEvents;
      }
      
      // Filter events since a specific timestamp
      if (since) {
        const sinceTime = new Date(since).getTime();
        events = events.filter(e => new Date(e.timestamp).getTime() > sinceTime);
      }
      
      res.status(200).json({
        ok: true,
        events: events,
        total: type === 'deployment' ? deploymentEvents.length : recentEvents.length,
        type: type || 'general',
        socketModeConnected: isConnected,
        lastPollTime: lastPollTime
      });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('❌ Error processing request:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Helper function to poll for new events
async function pollForNewEvents() {
  try {
    console.log('🔄 Polling for new events...');
    lastPollTime = new Date().toISOString();
    
    if (!webClient) {
      throw new Error('Slack client not initialized');
    }
    
    // Get list of channels the bot has access to
    const channelsResponse = await webClient.conversations.list({
      types: 'public_channel,private_channel',
      limit: 100
    });
    
    if (!channelsResponse.ok) {
      throw new Error(`Failed to get channels: ${channelsResponse.error}`);
    }
    
    let newEventsFound = 0;
    
    // Poll each channel for recent messages
    for (const channel of channelsResponse.channels) {
      try {
        // Get recent messages from the channel
        const messagesResponse = await webClient.conversations.history({
          channel: channel.id,
          limit: 10, // Get last 10 messages
          oldest: Math.floor((Date.now() - 5 * 60 * 1000) / 1000) // Last 5 minutes
        });
        
        if (messagesResponse.ok && messagesResponse.messages) {
          for (const message of messagesResponse.messages) {
            // Skip bot messages and messages we've already seen
            if (message.bot_id || message.subtype === 'bot_message') {
              continue;
            }
            
            // Check if we already have this message
            const existingEvent = recentEvents.find(e => 
              e.event.ts === message.ts && e.event.channel === message.channel
            );
            
            if (!existingEvent) {
              const eventData = {
                id: Date.now() + Math.random(),
                timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
                event: {
                  ...message,
                  channel_name: channel.name,
                  channel_id: channel.id
                },
                type: 'message',
                source: 'polling'
              };
              
              // Check if this is a deployment-related event
              const isDeploymentEvent = checkIfDeploymentEvent(message);
              
              if (isDeploymentEvent) {
                deploymentEvents.unshift(eventData);
                if (deploymentEvents.length > MAX_DEPLOYMENT_EVENTS) {
                  deploymentEvents = deploymentEvents.slice(0, MAX_DEPLOYMENT_EVENTS);
                }
              } else {
                recentEvents.unshift(eventData);
                if (recentEvents.length > MAX_EVENTS) {
                  recentEvents = recentEvents.slice(0, MAX_EVENTS);
                }
              }
              
              newEventsFound++;
              console.log(`📨 Found new message in #${channel.name}: ${message.text?.substring(0, 50)}...`);
            }
          }
        }
      } catch (channelError) {
        console.error(`Error polling channel ${channel.name}:`, channelError);
        // Continue with other channels
      }
    }
    
    console.log(`✅ Polling completed. Found ${newEventsFound} new events.`);
    return { success: true, newEventsFound, message: 'Polling completed' };
    
  } catch (error) {
    console.error('Polling error:', error);
    throw error;
  }
}

// Helper function to check if an event is deployment-related
function checkIfDeploymentEvent(event) {
  if (!event || !event.text) return false;
  
  const deploymentKeywords = [
    'deploy', 'deployment', 'jenkins', 'pipeline', 'build', 'release',
    'staging', 'production', 'successful', 'failed', 'job', 'build'
  ];
  
  const text = event.text.toLowerCase();
  return deploymentKeywords.some(keyword => text.includes(keyword));
} 