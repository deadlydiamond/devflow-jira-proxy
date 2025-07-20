# Slack Rate Limiting Implementation

## Overview

The SlackService has been updated to handle Slack's rate limits automatically. When Slack responds with `{ ok: false, error: "ratelimited" }`, the service will:

1. **Wait 60 seconds** before retrying once
2. **Show a warning toast** to the user: "Slack API limit reached. Retrying in 1 minute…"
3. **Prevent rapid calls** during the cooldown period
4. **Not retry more than once** per minute

## Implementation Details

### Rate Limiting State
- `isCooldown`: Boolean flag to track if we're in a rate limit cooldown
- `lastRateLimitTime`: Timestamp of the last rate limit hit
- `RATE_LIMIT_COOLDOWN`: 60 seconds cooldown period
- `RATE_LIMIT_RETRY_DELAY`: 60 seconds delay before retry

### Methods Affected
- `testConnection()`: Connection testing with rate limit handling
- `getChannels()`: Channel fetching with rate limit handling  
- `getChannelMessages()`: Message fetching with rate limit handling
- `getUsers()`: User fetching with rate limit handling
- `fetchAndProcessMessages()`: Uses `getChannelMessages()` so inherits rate limiting

### Toast Notifications
The service uses a `ToastService` to show user-friendly notifications:
- **Warning**: "Slack API limit reached. Retrying in 1 minute…"
- **Warning**: "Slack API cooldown active. Please wait X seconds."

### Cooldown Behavior
1. When a rate limit is hit, `isCooldown` is set to `true`
2. All subsequent API calls check `isInCooldown()` before proceeding
3. If in cooldown, calls are rejected with a warning toast
4. After 60 seconds, cooldown automatically expires
5. Only one retry is attempted per rate limit hit

## Usage

The rate limiting is automatic and transparent to the user. When you call any Slack API method:

```typescript
// This will automatically handle rate limits
this.slackService.fetchAndProcessMessages(10).subscribe({
  next: (deployments) => {
    console.log('Deployments fetched:', deployments);
  },
  error: (error) => {
    if (error.message.includes('Rate limit')) {
      // Rate limit was hit, service will handle retry
      console.log('Rate limit handled by service');
    } else {
      // Other error
      console.error('Other error:', error);
    }
  }
});
```

## Debugging

You can check the current cooldown status:

```typescript
const status = this.slackService.getCooldownStatus();
console.log('Cooldown active:', status.isInCooldown);
console.log('Remaining time:', status.remainingTime, 'seconds');
```

## Toast Component

The toast notifications appear in the top-right corner of the app and automatically disappear after the specified duration. Users can also manually dismiss them by clicking the ✕ button. 