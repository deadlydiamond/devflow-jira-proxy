const https = require('https');

module.exports = async (req, res) => {
  console.log('Jira proxy called:', { method: req.method, url: req.url, headers: req.headers });
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Jira-URL');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, url, headers } = req;
    
    // Parse body for non-GET requests
    let body = null;
    if (method !== 'GET' && req.body) {
      body = req.body;
    }
  
    // Extract the Jira API path from the request
    const jiraPath = url.replace('/api/jira', '');
    
    // Get the Jira base URL from headers or use default
    let jiraBaseUrl = headers['x-jira-url'] || 'https://whitehelmet.atlassian.net';
    
    // Ensure the URL has a protocol
    if (!jiraBaseUrl.startsWith('http')) {
      jiraBaseUrl = `https://${jiraBaseUrl}`;
    }
    
    const jiraUrl = `${jiraBaseUrl}${jiraPath}`;
    
    // Parse the hostname from the Jira URL
    const urlObj = new URL(jiraBaseUrl);

    // Only forward minimal headers for API token auth
    // STRIP all browser/XSRF/cookie headers
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: jiraPath,
      method: method,
      headers: {
        'Content-Type': headers['content-type'] || 'application/json',
        'Authorization': headers.authorization, // Should be Basic base64(email:api_token)
        'Accept': 'application/json',
        // No User-Agent, cookies, XSRF, or browser headers
      }
    };

    return new Promise((resolve, reject) => {
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
          resolve();
        });
      });

      jiraReq.on('error', (error) => {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Proxy error', message: error.message });
        resolve();
      });

      // Send request body if present and method is not GET
      if (body && method !== 'GET') {
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        jiraReq.write(bodyString);
      }
      
      jiraReq.end();
    });
  } catch (error) {
    console.error('Jira proxy error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}; 