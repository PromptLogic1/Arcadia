#!/usr/bin/env node

/**
 * Health check script
 * Simple HTTP check for the health endpoint
 * Used for production health monitoring
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health/live',
  method: 'GET',
  timeout: 3000,
};

const req = http.request(options, res => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.log(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', error => {
  console.log(`Health check failed with error: ${error.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();
