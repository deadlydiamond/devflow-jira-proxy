const { WebClient } = require('@slack/web-api');
const { SocketModeClient } = require('@slack/socket-mode');

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

// Socket mode client (will be initialized when needed)
let socketModeClient = null;
let isConnected = false;

// Initialize socket mode connection
async function initializeSocketMode() {
  if (socketModeClient && isConnected) {
    return { success: true, message: 'Already connected' };
  }

  try {
    console.log('🔌 Initializing Slack Socket Mode...');
    
    // Create socket mode client
    socketModeClient = new SocketModeClient({
      appToken: SLACK_APP_TOKEN,
      logLevel: 'info'
    });

    // Handle incoming events
    socketModeClient.on('events_api', async (event) => {
      console.log('📨 Received Slack event via socket mode:', JSON.stringify(event, null, 2));
      
      const slackEvent = event.body.event;
      
      if (slackEvent) {
        // Check if this is a deployment-related event
        const isDeploymentEvent = checkIfDeploymentEvent(slackEvent);
        
        const eventData = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          event: slackEvent,
          type: slackEvent.type || 'unknown',
          source: 'socket_mode'
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
        
        console.log(`✅ Stored ${isDeploymentEvent ? 'deployment' : 'general'} event via socket mode`);
      }
      
      // Acknowledge the event
      await event.ack();
    });

    // Handle connection events
    socketModeClient.on('connecting', () => {
      console.log('🔄 Connecting to Slack Socket Mode...');
    });

    socketModeClient.on('connected', () => {
      console.log('✅ Connected to Slack Socket Mode');
      isConnected = true;
    });

    socketModeClient.on('disconnected', () => {
      console.log('❌ Disconnected from Slack Socket Mode');
      isConnected = false;
    });

    socketModeClient.on('error', (error) => {
      console.error('❌ Socket Mode error:', error);
      isConnected = false;
    });

    // Start the client
    await socketModeClient.start();
    
    return { success: true, message: 'Socket mode connected successfully' };
    
  } catch (error) {
    console.error('❌ Failed to initialize socket mode:', error);
    return { success: false, error: error.message };
  }
}

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
        // Initialize socket mode connection
        const result = await initializeSocketMode();
        res.status(200).json(result);
        
      } else if (action === 'disconnect') {
        // Disconnect socket mode
        if (socketModeClient) {
          await socketModeClient.disconnect();
          socketModeClient = null;
          isConnected = false;
        }
        res.status(200).json({ success: true, message: 'Disconnected from socket mode' });
        
      } else if (action === 'status') {
        // Get connection status
        res.status(200).json({
          connected: isConnected,
          hasClient: !!socketModeClient,
          recentEventsCount: recentEvents.length,
          deploymentEventsCount: deploymentEvents.length
        });
        
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
        socketModeConnected: isConnected
      });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('❌ Error processing request:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

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