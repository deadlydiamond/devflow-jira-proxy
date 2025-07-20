const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Atlassian-Token', 'X-AUSERNAME']
}));

// Jira proxy middleware
app.use('/api/jira', (req, res) => {
  const { method, url, headers, body } = req;
  
  // Extract Jira API path
  const jiraPath = url;
  
  // Prepare request to Jira
  const options = {
    hostname: 'whitehelmet.atlassian.net',
    port: 443,
    path: jiraPath,
    method: method,
    headers: {
      'Content-Type': headers['content-type'] || 'application/json',
      'Authorization': headers.authorization,
      'User-Agent': 'DevFlow-App/1.0'
    }
  };

  // Add XSRF headers
  if (headers['x-atlassian-token']) {
    options.headers['X-Atlassian-Token'] = headers['x-atlassian-token'];
  }
  if (headers['x-ausername']) {
    options.headers['X-AUSERNAME'] = headers['x-ausername'];
  }

  const jiraReq = https.request(options, (jiraRes) => {
    let data = '';
    
    jiraRes.on('data', (chunk) => {
      data += chunk;
    });
    
    jiraRes.on('end', () => {
      // Forward Jira's response headers
      Object.keys(jiraRes.headers).forEach(key => {
        if (key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, jiraRes.headers[key]);
        }
      });
      
      res.status(jiraRes.statusCode);
      res.end(data);
    });
  });

  jiraReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  });

  // Send request body if present
  if (body && method !== 'GET') {
    jiraReq.write(JSON.stringify(body));
  }
  
  jiraReq.end();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Jira proxy server running' });
});

app.listen(PORT, () => {
  console.log(`Jira proxy server running on port ${PORT}`);
}); 