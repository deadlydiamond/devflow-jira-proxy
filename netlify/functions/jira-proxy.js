const https = require('https');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Atlassian-Token, X-AUSERNAME',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { httpMethod, path, headers: requestHeaders, body } = event;
    
    // Extract Jira API path
    const jiraPath = path.replace('/api/jira', '');
    
    // Prepare request to Jira
    const options = {
      hostname: 'whitehelmet.atlassian.net',
      port: 443,
      path: jiraPath,
      method: httpMethod,
      headers: {
        'Content-Type': requestHeaders['content-type'] || 'application/json',
        'Authorization': requestHeaders.authorization,
        'User-Agent': 'DevFlow-App/1.0'
      }
    };

    // Add XSRF headers
    if (requestHeaders['x-atlassian-token']) {
      options.headers['X-Atlassian-Token'] = requestHeaders['x-atlassian-token'];
    }
    if (requestHeaders['x-ausername']) {
      options.headers['X-AUSERNAME'] = requestHeaders['x-ausername'];
    }

    return new Promise((resolve, reject) => {
      const jiraReq = https.request(options, (jiraRes) => {
        let data = '';
        
        jiraRes.on('data', (chunk) => {
          data += chunk;
        });
        
        jiraRes.on('end', () => {
          resolve({
            statusCode: jiraRes.statusCode,
            headers: {
              ...headers,
              'Content-Type': jiraRes.headers['content-type'] || 'application/json'
            },
            body: data
          });
        });
      });

      jiraReq.on('error', (error) => {
        console.error('Proxy error:', error);
        resolve({
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Proxy error', message: error.message })
        });
      });

      // Send request body if present
      if (body && httpMethod !== 'GET') {
        jiraReq.write(body);
      }
      
      jiraReq.end();
    });

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
}; 