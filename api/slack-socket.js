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
      // Handle incoming Slack events
      const event = req.body;
      
      console.log('📨 Received Slack event:', JSON.stringify(event, null, 2));
      
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
          type: slackEvent.type || 'unknown'
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
        
        console.log(`✅ Stored ${isDeploymentEvent ? 'deployment' : 'general'} event`);
      }
      
      // Acknowledge the event
      res.status(200).json({ ok: true });
      
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
        type: type || 'general'
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