# 🔌 Slack Socket Mode Setup Guide

## Overview

Socket Mode enables real-time communication with Slack, providing instant deployment event updates instead of polling the API. This improves performance and reduces rate limit issues.

## 🚀 Quick Setup

### 1. Configure Socket Mode Token

1. Go to your **Slack App Settings**: https://app.slack.com/app-settings/T044XEXQXB2/A096VUK7L4R/socket-mode
2. Enable **Socket Mode**
3. Copy your **App-Level Token** (starts with `xapp-`)
4. Add it to your DevFlow settings

### 2. Start the Socket Mode Server

```bash
# Navigate to the devflow directory
cd devflow

# Install Socket Mode dependencies
npm install --prefix . @slack/web-api @slack/socket-mode ws

# Start the Socket Mode server
node socket-mode-server.js
```

### 3. Configure Environment Variables

Create a `.env` file in the `devflow` directory:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
```

## 🔧 Detailed Configuration

### Slack App Requirements

Your Slack app needs these **Bot Token Scopes**:

- `channels:history` - Read channel messages
- `channels:read` - View channel info  
- `users:read` - View user info
- `groups:history` - Read private channel messages (optional)

### Socket Mode Benefits

✅ **Real-time Events**: Instant deployment notifications  
✅ **No Polling**: Reduces API calls and rate limits  
✅ **Better Performance**: Lower latency and resource usage  
✅ **Automatic Reconnection**: Handles connection drops gracefully  

### Architecture

```
Slack Events → Socket Mode Server → WebSocket → Angular App
```

1. **Socket Mode Server** (`socket-mode-server.js`)
   - Connects to Slack via Socket Mode
   - Forwards events to Angular via WebSocket
   - Handles reconnection and error recovery

2. **Angular Socket Service** (`slack-socket.service.ts`)
   - Connects to the Socket Mode server
   - Processes real-time events
   - Updates UI with deployment status

3. **Message Service** (`slack-message.service.ts`)
   - Parses deployment messages
   - Manages deployment links
   - Triggers Jira updates

## 🛠️ Troubleshooting

### Connection Issues

**Problem**: Socket Mode server won't start
```bash
# Check if ports are available
netstat -an | findstr :3001

# Kill existing processes
taskkill /F /IM node.exe
```

**Problem**: Angular can't connect to Socket Mode
```bash
# Check if server is running
curl http://localhost:3001

# Check WebSocket connection
# Open browser dev tools and look for WebSocket errors
```

### Token Issues

**Problem**: "Invalid token" error
- Verify your App-Level Token starts with `xapp-`
- Ensure Socket Mode is enabled in your Slack app
- Check that the token is copied correctly

**Problem**: "Missing scopes" error
- Add required Bot Token Scopes to your Slack app
- Reinstall the app to your workspace
- Get a new Bot Token

### Event Processing Issues

**Problem**: No deployment events received
- Check that your Slack app is in the correct channel
- Verify the channel ID in settings
- Look for deployment message format: `SUCCESSFUL: Job 'STG-Frontend [1492]' (<URL>)`

## 📊 Monitoring

### Socket Mode Server Logs

```bash
# Start with debug logging
DEBUG=* node socket-mode-server.js

# Check connection status
🔌 Socket Mode connected
📨 Received Slack event: message
🚀 Found 1 deployment events
```

### Angular Console Logs

```javascript
// Check Socket Mode status
🔌 Socket Mode status: connected
📨 Received 1 events from Socket Mode
🚀 Found 1 deployment events
```

## 🔄 Migration from Polling

If you're currently using polling, Socket Mode will automatically:

1. **Replace polling** with real-time events
2. **Preserve existing** deployment links
3. **Maintain compatibility** with current features
4. **Improve performance** immediately

## 🚀 Production Deployment

### Environment Setup

```bash
# Set production environment variables
export SLACK_BOT_TOKEN="xoxb-your-production-token"
export SLACK_APP_TOKEN="xapp-your-production-socket-token"

# Start Socket Mode server
pm2 start socket-mode-server.js --name "slack-socket-mode"
```

### Security Considerations

- Store tokens securely (use environment variables)
- Use HTTPS in production
- Implement proper error handling
- Monitor connection health

## 📝 API Reference

### Socket Mode Events

```typescript
interface SlackEvent {
  type: string;
  channel?: string;
  text?: string;
  user?: string;
  ts?: string;
  attachments?: any[];
  bot_id?: string;
  subtype?: string;
}
```

### Deployment Message Format

```
SUCCESSFUL: Job 'STG-Frontend [1492]' (<https://deploy.whitehelmet.sa/job/STG-Frontend/1492/>)
STARTED: Job 'STG-Backend [1600]' (<https://deploy.whitehelmet.sa/job/STG-Backend/1600/>)
FAILED: Job 'STG-Database [1450]' (<https://deploy.whitehelmet.sa/job/STG-Database/1450/>)
```

## 🎯 Next Steps

1. **Test the setup** with a deployment message
2. **Monitor performance** improvements
3. **Configure alerts** for connection issues
4. **Scale the architecture** as needed

---

**Need help?** Check the console logs for detailed error messages and connection status. 