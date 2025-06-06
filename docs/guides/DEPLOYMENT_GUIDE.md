# Deployment Guide

⚠️ **WARNING**: This application is NOT production-ready. See [PROJECT_STATUS.md](/docs/PROJECT_STATUS.md) for critical issues that must be resolved before deployment.

## Pre-Deployment Checklist

### Critical Requirements

- [ ] All TypeScript errors resolved (currently ✅)
- [ ] Test coverage > 80% (currently ❌ 0%)
- [ ] Security audit completed (currently ❌)
- [ ] Performance optimizations done (currently ❌)
- [ ] Error boundaries implemented (currently ✅)
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Rate limiting implemented (currently ❌)
- [ ] API validation added (currently ❌)

## Deployment Platforms

### Vercel (Recommended)

The project is optimized for Vercel deployment.

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Deploy

```bash
vercel --prod
```

#### 3. Environment Variables

Set these in Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
```

### Docker Deployment

#### 1. Build Docker Image

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### 2. Build and Run

```bash
docker build -t arcadia .
docker run -p 3000:3000 --env-file .env.production arcadia
```

### Traditional VPS

#### 1. Server Requirements

- Node.js 22+
- nginx (reverse proxy)
- PM2 (process manager)
- SSL certificate

#### 2. Build Application

```bash
npm ci --production
npm run build
```

#### 3. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'arcadia',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 'max',
      exec_mode: 'cluster',
    },
  ],
};
```

#### 4. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Database Deployment

### Supabase Production Setup

1. **Create Production Project**

   ```bash
   mcp__supabase__create_project \
     --name="arcadia-production" \
     --organization_id="your-org-id" \
     --region="us-east-1"
   ```

2. **Run Migrations**

   ```bash
   mcp__supabase__apply_migration \
     --project_id="prod-project-id" \
     --name="production_schema" \
     --query="$(cat supabase/migrations/*.sql)"
   ```

3. **Configure RLS Policies**

   - Review all Row Level Security policies
   - Ensure proper access controls
   - Test with different user roles

4. **Enable Realtime**
   ```sql
   -- Enable realtime for required tables
   ALTER PUBLICATION supabase_realtime
   ADD TABLE bingo_sessions, bingo_session_players;
   ```

## Environment Configuration

### Production Environment Variables

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Sentry
SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx

# Security
NEXTAUTH_SECRET=generate-secure-secret
NEXTAUTH_URL=https://yourdomain.com
```

### Generate Secrets

```bash
# Generate secure secrets
openssl rand -base64 32
```

## Performance Optimization

### 1. Enable Static Optimization

```javascript
// next.config.ts
const config = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/avif', 'image/webp'],
  },
};
```

### 2. CDN Configuration

Use Cloudflare or similar:

```
Cache-Control: public, max-age=31536000, immutable  # For static assets
Cache-Control: no-cache, no-store, must-revalidate  # For dynamic content
```

### 3. Database Indexes

Create indexes for frequently queried fields:

```sql
CREATE INDEX idx_sessions_code ON bingo_sessions(session_code);
CREATE INDEX idx_players_session ON bingo_session_players(session_id);
CREATE INDEX idx_boards_creator ON bingo_boards(created_by);
```

## Monitoring Setup

### 1. Sentry Configuration

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% in production
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
});
```

### 2. Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database
    await supabase.from('users').select('count').single();

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      { status: 503 }
    );
  }
}
```

### 3. Uptime Monitoring

Configure services like:

- UptimeRobot
- Pingdom
- Better Uptime

## Security Hardening

### 1. Headers Configuration

```typescript
// middleware.ts
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```

### 2. Rate Limiting

Implement rate limiting (currently missing):

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const rateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
```

### 3. Input Validation

Add Zod validation to all API routes:

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Validate in API route
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return Response.json({ error: parsed.error }, { status: 400 });
}
```

## Deployment Pipeline

### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Post-Deployment

### 1. Smoke Tests

Run critical path tests:

```bash
# Test authentication
curl https://yourdomain.com/api/health

# Test WebSocket connections
wscat -c wss://yourdomain.com/socket
```

### 2. Monitor Metrics

- Response times < 200ms
- Error rate < 1%
- Uptime > 99.9%
- Core Web Vitals passing

### 3. Backup Strategy

- Database: Daily automated backups
- Code: Git repository
- Assets: CDN with origin backup

## Rollback Procedure

### Vercel

```bash
vercel rollback
```

### Docker

```bash
docker stop arcadia
docker run -p 3000:3000 arcadia:previous-version
```

### Database

```sql
-- Revert migration
BEGIN;
-- Rollback SQL here
COMMIT;
```

## Troubleshooting Deployment

### Common Issues

1. **Build Failures**

   - Check TypeScript errors
   - Verify environment variables
   - Check dependency versions

2. **Runtime Errors**

   - Check Sentry for errors
   - Review server logs
   - Verify database connection

3. **Performance Issues**
   - Check bundle size
   - Review database queries
   - Monitor memory usage

### Debug Commands

```bash
# Check process
pm2 status

# View logs
pm2 logs arcadia

# Monitor resources
pm2 monit

# Database status
mcp__supabase__get_logs --service=postgres
```

## Scaling Considerations

### Horizontal Scaling

- Use Vercel's auto-scaling
- Or configure Kubernetes
- Ensure session affinity for WebSockets

### Database Scaling

- Enable connection pooling
- Use read replicas
- Implement caching layer

### CDN Strategy

- Static assets on CDN
- API responses cached where possible
- Regional edge functions

## CRITICAL WARNINGS

⚠️ **DO NOT DEPLOY WITHOUT**:

1. **Security Audit** - Multiple vulnerabilities exist
2. **Performance Testing** - Will crash under load
3. **Test Coverage** - 0% coverage is unacceptable
4. **Rate Limiting** - APIs are unprotected
5. **Input Validation** - Security holes everywhere

See [PRODUCTION_REMEDIATION_PLAN.md](/docs/PRODUCTION_REMEDIATION_PLAN.md) for the complete list of issues that MUST be fixed before any production deployment.
