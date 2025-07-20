const https = require('https');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Atlassian-Token, X-AUSERNAME');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, url, headers, body } = req;
  
  // Extract the Jira API path from the request
  const jiraPath = url.replace('/api/jira', '');
  
  // Get the Jira base URL from the Authorization header or use default
  let jiraBaseUrl = 'https://whitehelmet.atlassian.net';
  
  // Try to extract Jira URL from Authorization header if it contains domain info
  if (headers.authorization && headers.authorization.includes('Basic')) {
    // For now, use the default URL, but this could be enhanced to extract from auth
    jiraBaseUrl = 'https://whitehelmet.atlassian.net';
  }
  
  const jiraUrl = `${jiraBaseUrl}${jiraPath}`;
  
  // Parse the hostname from the Jira URL
  const urlObj = new URL(jiraBaseUrl);
  
  // Forward the request to Jira
  const options = {
    hostname: urlObj.hostname,
    port: 443,
    path: jiraPath,
    method: method,
    headers: {
      'Content-Type': headers['content-type'] || 'application/json',
      'Authorization': headers.authorization,
      'User-Agent': headers['user-agent'] || 'DevFlow-App/1.0'
    }
  };

  // Add XSRF headers if present
  if (headers['x-atlassian-token']) {
    options.headers['X-Atlassian-Token'] = headers['x-atlassian-token'];
  }
  if (headers['x-ausername']) {
    options.headers['X-AUSERNAME'] = headers['x-ausername'];
  }

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

    // Send request body if present
    if (body && method !== 'GET') {
      jiraReq.write(JSON.stringify(body));
    }
    
    jiraReq.end();
  });
}; 