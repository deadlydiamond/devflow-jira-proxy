const { WebClient } = require('@slack/web-api');

// Slack configuration
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || 'xoxb-your-bot-token-here';
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN || 'xapp-your-app-token-here';

// Initialize Slack client
const webClient = new WebClient(SLACK_BOT_TOKEN);

// In-memory storage for events (in production, you'd use a database like Redis or MongoDB)
let recentEvents = [];
const MAX_EVENTS = 100;

// Store deployment tracking events separately
let deploymentEvents = [];
const MAX_DEPLOYMENT_EVENTS = 50;

// Connection status
let isConnected = false;
let lastPollTime = null;

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
      const { action } = req.body;
      
      if (action === 'connect') {
        // Initialize polling-based connection
        try {
          console.log('🔌 Initializing Slack polling connection...');
          
          // Test the connection by making a simple API call
          const authTest = await webClient.auth.test();
          
          if (authTest.ok) {
            isConnected = true;
            lastPollTime = new Date().toISOString();
            
            console.log('✅ Connected to Slack API for polling');
            res.status(200).json({ 
              success: true, 
              message: 'Connected to Slack API for event polling',
              botName: authTest.user,
              teamName: authTest.team
            });
          } else {
            throw new Error('Slack API authentication failed');
          }
        } catch (error) {
          console.error('❌ Failed to connect to Slack API:', error);
          isConnected = false;
          res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to connect to Slack API'
          });
        }
        
      } else if (action === 'disconnect') {
        // Disconnect polling
        isConnected = false;
        lastPollTime = null;
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
        if (!isConnected) {
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
    // This is a placeholder - in a real implementation, you would:
    // 1. Get the last message timestamp from your storage
    // 2. Call Slack API to get messages since that timestamp
    // 3. Process new messages and store them
    
    console.log('🔄 Polling for new events...');
    lastPollTime = new Date().toISOString();
    
    // For now, just return success
    return { success: true, message: 'Polling completed' };
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