# Getting Started with Arcadia

Welcome to Arcadia - A multiplayer gaming platform built with Next.js 15, TypeScript, and Supabase.

## Prerequisites

- Node.js 22.16.0 or higher
- npm or yarn
- Git
- A Supabase account and project

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/arcadia.git
cd arcadia
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Sentry Configuration (Optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### 4. Database Setup

The project uses Supabase for the database. Ensure your Supabase project has the required tables by running migrations:

```bash
# Using Supabase MCP (recommended)
# First, get your project ID
mcp__supabase__list_projects

# Then apply migrations
mcp__supabase__apply_migration --project_id=your-project-id
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
arcadia/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # Shared components
│   ├── features/         # Feature-specific modules
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and configurations
│   ├── services/        # API service layer
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
├── docs/               # Documentation
└── supabase/           # Database migrations and config
```

## Key Features

- **Multiplayer Bingo Games**: Real-time multiplayer bingo sessions
- **Community Hub**: Discussion forums and events
- **User Authentication**: Secure auth with Supabase
- **Real-time Updates**: Live game state synchronization
- **Responsive Design**: Works on desktop and mobile

## Development Workflow

### Code Style

The project uses:

- TypeScript with strict mode enabled
- ESLint for code linting
- Prettier for code formatting

Run checks before committing:

```bash
npm run type-check  # TypeScript validation
npm run lint        # ESLint checks
npm run build       # Production build test
```

### State Management

- **Zustand**: For client-side UI state
- **TanStack Query**: For server state and caching
- **Supabase Realtime**: For live updates

### Component Development

Follow the established patterns:

```typescript
// Feature components go in /features
// Shared UI components go in /components/ui
// Use the existing design system tokens
```

## Common Tasks

### Creating a New Feature

1. Create a new directory in `/src/features/your-feature/`
2. Add components, hooks, and types subdirectories
3. Follow existing patterns for state management
4. Add to the main navigation if needed

### Working with the Database

- Types are auto-generated from Supabase
- Run type generation after schema changes:
  ```bash
  mcp__supabase__generate_typescript_types --project_id=your-project-id
  ```

### Debugging

- Console logs are stripped in production
- Use the built-in logger: `import { logger } from '@/lib/logger'`
- Sentry captures errors in production

## Troubleshooting

### Common Issues

1. **Build Errors**: Ensure all TypeScript errors are resolved
2. **Database Connection**: Check your Supabase credentials
3. **Real-time Not Working**: Verify Supabase realtime is enabled
4. **Authentication Issues**: Check Supabase auth settings

### Getting Help

- Check `/docs/troubleshooting/COMMON_ISSUES.md`
- Review existing code patterns
- Check the project's issue tracker

## Next Steps

- Read the [Architecture Guide](/docs/architecture/COMPONENT_ARCHITECTURE.md)
- Review [Contributing Guidelines](/docs/contributing/CONTRIBUTING.md)
- Explore the [API Documentation](/docs/api/README.md)
- Check the [Current Project Status](/docs/PROJECT_STATUS.md)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
