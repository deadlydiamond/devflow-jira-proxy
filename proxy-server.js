const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 4201;

// Enable CORS
app.use(cors());

// Proxy middleware configuration
const proxyOptions = {
  target: 'https://whitehelmet.atlassian.net',
  changeOrigin: true,
  secure: true,
  logLevel: 'debug',
  pathRewrite: {
    '^/rest/api/3': '/rest/api/3' // Keep the path as is
  },
  onProxyReq: function(proxyReq, req, res) {
    console.log('Proxying request:', req.method, req.url);
    
    // Forward all headers from the original request
    Object.keys(req.headers).forEach(key => {
      proxyReq.setHeader(key, req.headers[key]);
    });
    
    // Ensure POST requests are handled properly
    if (req.method === 'POST') {
      proxyReq.setHeader('Content-Type', 'application/json');
    }
    
    // Log the Authorization header (without revealing the actual token)
    if (req.headers.authorization) {
      console.log('Authorization header present:', req.headers.authorization.substring(0, 20) + '...');
    } else {
      console.log('No Authorization header found');
    }
  },
  onError: function(err, req, res) {
    console.error('Proxy error:', err);
  },
  onProxyRes: function(proxyRes, req, res) {
    console.log('Proxy response status:', proxyRes.statusCode);
  }
};

// Create proxy middleware
const proxy = createProxyMiddleware(proxyOptions);

// Use the proxy for all /rest/api/3 requests
app.use('/rest/api/3', proxy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Proxy server running on port 4201' });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('Proxying /rest/api/3/* requests to https://whitehelmet.atlassian.net');
}); 
 