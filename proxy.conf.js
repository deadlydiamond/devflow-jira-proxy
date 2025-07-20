const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/rest/api/3',
    createProxyMiddleware({
      target: 'https://whitehelmet.atlassian.net',
      changeOrigin: true,
      secure: true,
      logLevel: 'debug',
      onProxyReq: function(proxyReq, req, res) {
        console.log('Proxying request:', req.method, req.url);
        // Ensure POST requests are handled properly
        if (req.method === 'POST') {
          proxyReq.setHeader('Content-Type', 'application/json');
        }
      },
      onError: function(err, req, res) {
        console.error('Proxy error:', err);
      },
      // Add specific handling for POST requests
      onProxyRes: function(proxyRes, req, res) {
        console.log('Proxy response:', proxyRes.statusCode, req.method, req.url);
      }
    })
  );
}; 