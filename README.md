# DevFlow

A comprehensive development workflow management tool that integrates Slack, Jira, and AI-powered features to streamline your development process.

## Features

### 🚀 Deployment Tracking
- **Real-time Monitoring**: Track deployment status with automatic 60-second polling
- **Persistent Notifications**: Get notified when deployments succeed or fail with persistent toasts
- **Slack Integration**: Monitor deployment messages from Slack channels
- **Jira Integration**: Link deployments to Jira tickets for better traceability

#### How Deployment Tracking Works:
1. **Select a Deployment**: Choose a deployment with "Started" status from the Slack page
2. **Automatic Monitoring**: The system checks deployment status every 60 seconds
3. **Smart Notifications**: Receive persistent notifications when:
   - Deployment succeeds (green notification)
   - Deployment fails (red notification)
   - Tracking starts (info notification)
4. **Manual Control**: Dismiss notifications manually or stop tracking anytime

### 📊 Slack Integration
- Fetch and parse deployment messages from Slack channels
- Support for bot messages and Jenkins-style notifications
- Real-time deployment status tracking
- Automatic message parsing and categorization

### 🎯 Jira Integration
- Link deployments to Jira tickets
- Track deployment status by Jira ticket
- Comprehensive sprint workspace with AI tools
- Story management and estimation features

### 🤖 AI-Powered Features
- Generate subtasks and test cases
- Estimate story time and complexity
- Improve story titles and descriptions
- Generate translations and corner case questions
- Frontend/Backend estimation breakdown

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Services**:
   - Set up Slack bot token and channel ID in Settings
   - Configure Jira API credentials
   - Add OpenAI API key for AI features

3. **Start Development Server**:
```bash
   npm start
```

4. **Access the Application**:
   - Navigate to `http://localhost:4200`
   - Use the Slack page to track deployments
   - Configure integrations in the Settings page

## Deployment Tracking Usage

### Basic Workflow:
1. Go to the **Slack** page
2. Fetch messages from your deployment channel
3. Look for deployments with "Started" status
4. Click "🔄 Start Tracking" on a deployment
5. Monitor the tracking status in real-time
6. Receive notifications when deployment completes

### Features:
- **60-second polling**: Automatic status checks every minute
- **Persistent notifications**: Toasts stay visible until dismissed
- **Success/Failure detection**: Automatic notification on status change
- **Manual control**: Stop tracking anytime with the stop button

### Supported Message Formats:
- ✅ `SUCCESSFUL: Job 'STG-Frontend [1485]'`
- ❌ `FAILURE: Job 'STG-Frontend [1484]'`
- 🚀 `STARTED: Job 'STG-Frontend [1485]'`

## Configuration

### Slack Setup:
1. Create a Slack bot and get the bot token
2. Add the bot to your deployment channel
3. Get the channel ID from Slack
4. Configure in Settings page

### Jira Setup:
1. Get your Jira domain URL
2. Create an API token
3. Configure in Settings page

### OpenAI Setup:
1. Get an OpenAI API key
2. Configure in Settings page for AI features

## Development

### Project Structure:
```
src/
├── app/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Main application pages
│   ├── services/           # Business logic and API services
│   └── shell-layout/       # Main application layout
```

### Key Services:
- `SlackDeploymentService`: Deployment tracking and management
- `SlackService`: Slack API integration
- `JiraService`: Jira API integration
- `ToastService`: Notification system
- `OpenAIService`: AI-powered features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
