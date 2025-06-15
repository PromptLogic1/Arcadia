#!/usr/bin/env node

/**
 * Smoke Tests for Arcadia Deployment
 *
 * Runs basic functionality tests against a deployed environment
 * to ensure core features are working after deployment.
 */

const https = require('https');
const http = require('http');

const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

class SmokeTestRunner {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.passedTests = 0;
    this.failedTests = 0;
    this.results = [];
  }

  async runTest(name, testFn) {
    console.log(`🧪 Running: ${name}`);
    const startTime = Date.now();

    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`✅ PASS: ${name} (${duration}ms)`);
      this.passedTests++;
      this.results.push({ name, status: 'PASS', duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAIL: ${name} (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      this.failedTests++;
      this.results.push({
        name,
        status: 'FAIL',
        duration,
        error: error.message,
      });
    }
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;

      const requestOptions = {
        timeout: TIMEOUT,
        headers: {
          'User-Agent': 'Arcadia-SmokeTest/1.0',
          ...options.headers,
        },
        ...options,
      };

      const req = client.get(url, requestOptions, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${TIMEOUT}ms`));
      });
    });
  }

  // Test: Basic Health Check
  async testHealthCheck() {
    const response = await this.makeRequest('/api/health');

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const health = JSON.parse(response.body);

    if (health.status !== 'healthy' && health.status !== 'degraded') {
      throw new Error(`Health status is ${health.status}`);
    }

    if (!health.checks || health.checks.length === 0) {
      throw new Error('No health checks found');
    }
  }

  // Test: Detailed Health Check
  async testDetailedHealth() {
    const response = await this.makeRequest('/api/health/detailed');

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const health = JSON.parse(response.body);

    // Check if essential services are reported
    const services = health.checks?.map(check => check.service) || [];
    const requiredServices = ['database'];

    for (const service of requiredServices) {
      if (!services.includes(service)) {
        throw new Error(`Missing health check for ${service}`);
      }
    }
  }

  // Test: Readiness Probe
  async testReadinessProbe() {
    const response = await this.makeRequest('/api/health/ready');

    if (response.statusCode !== 200) {
      throw new Error(`Readiness probe failed: ${response.statusCode}`);
    }
  }

  // Test: Liveness Probe
  async testLivenessProbe() {
    const response = await this.makeRequest('/api/health/live');

    if (response.statusCode !== 200) {
      throw new Error(`Liveness probe failed: ${response.statusCode}`);
    }
  }

  // Test: Homepage loads
  async testHomepage() {
    const response = await this.makeRequest('/');

    if (response.statusCode !== 200) {
      throw new Error(`Homepage returned ${response.statusCode}`);
    }

    if (!response.body.includes('Arcadia')) {
      throw new Error('Homepage does not contain expected content');
    }
  }

  // Test: Security Headers
  async testSecurityHeaders() {
    const response = await this.makeRequest('/');

    const requiredHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'content-security-policy',
    ];

    for (const header of requiredHeaders) {
      if (
        !response.headers[header] &&
        !response.headers[header.toLowerCase()]
      ) {
        throw new Error(`Missing security header: ${header}`);
      }
    }
  }

  // Test: API Rate Limiting Headers
  async testRateLimitHeaders() {
    const response = await this.makeRequest('/api/health');

    // Check if rate limit headers are present (they should be for production)
    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ];

    // Note: Not all deployments may have rate limiting enabled
    // So we just log if they're missing rather than failing
    let hasRateLimiting = false;
    for (const header of rateLimitHeaders) {
      if (response.headers[header] || response.headers[header.toLowerCase()]) {
        hasRateLimiting = true;
        break;
      }
    }

    if (!hasRateLimiting) {
      console.log(
        '   ℹ️  Rate limiting headers not found (may not be configured)'
      );
    }
  }

  // Test: API endpoints don't return errors
  async testApiEndpoints() {
    const endpoints = [
      '/api/health',
      '/api/health/ready',
      '/api/health/live',
      '/api/health/detailed',
    ];

    for (const endpoint of endpoints) {
      const response = await this.makeRequest(endpoint);

      if (response.statusCode >= 500) {
        throw new Error(
          `${endpoint} returned server error: ${response.statusCode}`
        );
      }
    }
  }

  // Test: Static assets load
  async testStaticAssets() {
    // Test if we can load the favicon
    const response = await this.makeRequest('/favicon.ico');

    // 200 or 404 is acceptable (some deployments might not have favicon)
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Unexpected status for favicon: ${response.statusCode}`);
    }
  }

  // Test: CSP nonce is present and valid
  async testCSPNonce() {
    const response = await this.makeRequest('/');

    const cspHeader = response.headers['content-security-policy'];
    if (!cspHeader) {
      throw new Error('No CSP header found');
    }

    // Check if nonce is present in CSP
    if (!cspHeader.includes("'nonce-")) {
      throw new Error('CSP header does not contain nonce');
    }
  }

  async runAllTests() {
    console.log(`🚀 Starting smoke tests against: ${this.baseUrl}\n`);

    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Detailed Health Check', () =>
      this.testDetailedHealth()
    );
    await this.runTest('Readiness Probe', () => this.testReadinessProbe());
    await this.runTest('Liveness Probe', () => this.testLivenessProbe());
    await this.runTest('Homepage Load', () => this.testHomepage());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Rate Limit Headers', () => this.testRateLimitHeaders());
    await this.runTest('API Endpoints', () => this.testApiEndpoints());
    await this.runTest('Static Assets', () => this.testStaticAssets());
    await this.runTest('CSP Nonce', () => this.testCSPNonce());

    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.failedTests}`);
    console.log(`📈 Total:  ${this.passedTests + this.failedTests}`);

    if (this.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(result => result.status === 'FAIL')
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.error}`);
        });
    }

    // Exit with error code if any tests failed
    if (this.failedTests > 0) {
      console.log('\n💥 Smoke tests failed! Check the issues above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All smoke tests passed! Deployment looks healthy.');
      process.exit(0);
    }
  }
}

// Run the tests
const runner = new SmokeTestRunner(DEPLOYMENT_URL);
runner.runAllTests().catch(error => {
  console.error('💥 Smoke test runner failed:', error);
  process.exit(1);
});
