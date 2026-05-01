// Start BullMQ worker + health HTTP server
const http = require('http');

require('./worker');

// Health server on port 5001
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

healthServer.listen(5001, '0.0.0.0', () => {
  console.log('Scraper health server listening on port 5001');
});
