const { WebClient } = require('@slack/web-api');
const { SocketModeClient } = require('@slack/socket-mode');
const WebSocket = require('ws');
const http = require('http');

// Slack configuration
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || 'xoxb-your-bot-token-here';
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN || 'xapp-your-app-token-here';

console.log('🔧 Socket Mode Configuration:');
console.log(`📡 Bot Token: ${SLACK_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`🔌 App Token: ${SLACK_APP_TOKEN ? '✅ Set' : '❌ Missing'}`);

// Initialize Slack clients
const webClient = new WebClient(SLACK_BOT_TOKEN);
const socketModeClient = new SocketModeClient({
  appToken: SLACK_APP_TOKEN,
  logLevel: 'debug'
});

// WebSocket server for Angular frontend
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store connected Angular clients
const angularClients = new Set();

// Handle WebSocket connections from Angular
wss.on('connection', (ws) => {
  console.log('🔌 Angular client connected');
  angularClients.add(ws);

  ws.on('close', () => {
    console.log('🔌 Angular client disconnected');
    angularClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    angularClients.delete(ws);
  });
});

// Forward Slack events to Angular clients
function forwardToAngular(event) {
  let slackEvent = null;
  
  // Extract the actual Slack event from different event types
  if (event.type === 'events_api' && event.body && event.body.event) {
    slackEvent = event.body.event;
  } else if (event.body && event.body.event) {
    slackEvent = event.body.event;
  } else if (event.data && event.data.event) {
    // Handle the nested structure from your event
    slackEvent = event.data.event;
  } else if (event.type === 'message' || event.channel) {
    // Direct message event
    slackEvent = event;
  }
  
  if (slackEvent) {
    const message = JSON.stringify({
      type: 'slack_event',
      data: slackEvent
    });

    console.log('📤 Forwarding to Angular:', JSON.stringify(slackEvent, null, 2));
    
    angularClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } else {
    console.log('⚠️ Could not extract Slack event from:', event.type);
    console.log('📨 Full event structure:', JSON.stringify(event, null, 2));
  }
}

// Handle Slack Socket Mode events
socketModeClient.on('message', async (event) => {
  try {
    console.log('📨 Received Slack event:', JSON.stringify(event, null, 2));

    // Forward the event to Angular (this will extract the correct Slack event)
    forwardToAngular(event);

    // Acknowledge the event - use the correct method
    if (socketModeClient.ack) {
      await socketModeClient.ack(event);
    } else {
      console.log('⚠️ Warning: ack method not available');
    }
    console.log('✅ Event acknowledged successfully');
    
  } catch (error) {
    console.error('❌ Error processing event:', error);
    // Still try to acknowledge to prevent disconnection
    try {
      if (socketModeClient.ack) {
        await socketModeClient.ack(event);
      }
    } catch (ackError) {
      console.error('❌ Error acknowledging event:', ackError);
    }
  }
});

// Handle Socket Mode connection
socketModeClient.on('connecting', () => {
  console.log('🔄 Connecting to Slack Socket Mode...');
});

socketModeClient.on('connected', () => {
  console.log('✅ Connected to Slack Socket Mode');
});

socketModeClient.on('disconnected', () => {
  console.log('❌ Disconnected from Slack Socket Mode');
});

socketModeClient.on('error', (error) => {
  console.error('❌ Socket Mode error:', error);
});

// Start the servers
async function start() {
  try {
    // Start Socket Mode client
    await socketModeClient.start();
    console.log('🚀 Socket Mode client started');

    // Start WebSocket server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🌐 WebSocket server running on port ${PORT}`);
      console.log(`📡 Angular can connect to: ws://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start servers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');
  
  // Close WebSocket connections
  angularClients.forEach(client => client.close());
  wss.close();
  
  // Stop Socket Mode client
  await socketModeClient.stop();
  
  server.close(() => {
    console.log('✅ Servers stopped');
    process.exit(0);
  });
});

// Start the application
start(); 