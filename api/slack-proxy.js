const https = require('https');

module.exports = async (req, res) => {
  console.log('Slack proxy called:', { method: req.method, url: req.url, headers: req.headers });
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Slack-Token');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, url, headers, body } = req;
    
    // Get Slack token from headers
    const slackToken = headers['x-slack-token'] || headers['authorization']?.replace('Bearer ', '');
    
    if (!slackToken) {
      return res.status(400).json({ 
        ok: false, 
        error: 'missing_slack_token',
        message: 'Slack token is required' 
      });
    }

    // Extract the Slack API endpoint from the URL
    // URL format: /api/slack/auth.test -> /auth.test
    const slackEndpoint = url.replace('/api/slack', '');
    console.log('Slack endpoint:', slackEndpoint);
    
    // Prepare the request to Slack API
    const slackUrl = `https://slack.com/api${slackEndpoint}`;
    console.log('Proxying to:', slackUrl);
    
    // Prepare request options
    const options = {
      hostname: 'slack.com',
      path: `/api${slackEndpoint}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DevFlow-Slack-Proxy/1.0'
      }
    };

    // Add query parameters if they exist
    if (Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query).toString();
      options.path += `?${queryString}`;
    }

    // Make request to Slack API
    const slackRequest = https.request(options, (slackRes) => {
      let data = '';
      
      slackRes.on('data', (chunk) => {
        data += chunk;
      });
      
      slackRes.on('end', () => {
        console.log('Slack response status:', slackRes.statusCode);
        try {
          const response = JSON.parse(data);
          
          // Forward Slack's response
          res.status(slackRes.statusCode).json(response);
        } catch (parseError) {
          console.error('Error parsing Slack response:', parseError);
          res.status(500).json({ 
            ok: false, 
            error: 'parse_error',
            message: 'Failed to parse Slack response' 
          });
        }
      });
    });

    slackRequest.on('error', (error) => {
      console.error('Error making request to Slack:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'slack_request_error',
        message: 'Failed to connect to Slack API' 
      });
    });

    // Send body if it exists
    if (body && method !== 'GET') {
      slackRequest.write(JSON.stringify(body));
    }
    
    slackRequest.end();

  } catch (error) {
    console.error('Slack proxy error:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'internal_error',
      message: 'Internal server error' 
    });
  }
}; 