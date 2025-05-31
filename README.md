# Arcadia 🎮

A modern gaming platform that transforms everyday gaming experiences into competitive and social adventures through customizable bingo boards, real-time multiplayer sessions, and community-driven challenges.

## 🌟 Features

- **🎯 Bingo Board System**: Create and play customizable gaming bingo boards
- **🔄 Real-time Multiplayer**: Live sessions with presence tracking and synchronized gameplay
- **🏷️ Smart Tag System**: Categorize and filter boards with a community-driven tag system
- **👥 Community Hub**: Share boards, discuss strategies, and participate in events
- **📊 Game Analytics**: Track performance, completion times, and player statistics
- **🎨 Modern UI**: Tailwind CSS v4 with custom Neon/Arcade theme components
- **🔐 Secure Authentication**: Supabase Auth with OAuth support
- **⚡ Edge-First Architecture**: Optimized for performance with Next.js 15

## Table of Contents

- [Features](#-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
  - [Running the Development Server](#running-the-development-server)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development](#development)
  - [Available Scripts](#available-scripts)
  - [Code Quality](#code-quality)
  - [Testing](#testing)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- **Node.js** v18.x or later (v20.x recommended)
- **npm** v9.x or later (comes with Node.js)
- **Supabase CLI** (optional, for local development)
- **Git** for version control

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/arcadia.git
   cd arcadia
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Install Supabase CLI (optional, for local development):**
   ```bash
   npm install -g supabase
   ```

### Environment Setup

1. **Copy the example environment file:**

   ```bash
   cp .env.example .env.local
   ```

2. **Configure the following environment variables:**

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Optional: Analytics
   NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_vercel_analytics_id
   ```

### Database Setup

1. **Option A: Use Supabase Cloud (Recommended for beginners)**

   - Create a project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key to `.env.local`
   - Run migrations: `npm run db:migrate`

2. **Option B: Local Supabase Development**

   ```bash
   # Start local Supabase
   npm run db:start

   # Apply migrations
   npm run db:migrate

   # Generate TypeScript types
   npm run db:types
   ```

### Running the Development Server

```bash
# Standard development mode
npm run dev

# Development with Turbo mode (faster HMR)
npm run dev:turbo
```

Open [http://localhost:3000](http://localhost:3000) to see the application running.

**First-time setup checklist:**

- ✅ Environment variables configured
- ✅ Database migrations applied
- ✅ TypeScript types generated
- ✅ Development server running

## ⚠️ **Current Project Status (Important!)**

**Database Foundation**: ✅ **Complete** - Production-ready schema with 25 tables  
**Core Multiplayer**: ⚠️ **68% Complete** - Critical gaps need fixing  
**Next Priority**: 🚨 **[Phase 1 Implementation](./docs/PHASE_1_IMPLEMENTATION.md)** - Bridge database-frontend gap

**What Works:** Board creation, user auth, basic UI, database operations  
**What's Broken:** Real-time multiplayer sessions, board state sync, session joining  
**Immediate Goal:** Get multiplayer bingo game working end-to-end

📋 **Next Steps:** See [DEVELOPMENT_ROADMAP.md](./docs/DEVELOPMENT_ROADMAP.md) for detailed plan

## Tech Stack

### Core Technologies

- **Framework:** [Next.js 15](https://nextjs.org/) with App Router
- **Language:** [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (New York style)
- **Database:** [Supabase](https://supabase.io/) (PostgreSQL + Real-time)
- **State Management:** [Zustand v5](https://github.com/pmndrs/zustand)
- **Forms:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)

### Additional Libraries

- **Data Fetching:** [TanStack Query](https://tanstack.com/query)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Virtual Scrolling:** [TanStack Virtual](https://tanstack.com/virtual)
- **Testing:** [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/react)
- **Code Quality:** [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/)
- **Analytics:** Vercel Analytics & Speed Insights

## Project Structure

```
arcadia/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── challenge-hub/     # Challenge browsing
│   │   ├── community/         # Community features
│   │   ├── play-area/         # Game modes
│   │   └── ...
│   ├── features/              # Feature-based modules
│   │   ├── auth/             # Authentication logic
│   │   ├── bingo-boards/     # Core game feature
│   │   │   ├── components/   # Feature components
│   │   │   ├── hooks/        # Feature hooks
│   │   │   ├── services/     # API services
│   │   │   └── types/        # TypeScript types
│   │   ├── community/        # Social features
│   │   └── ...
│   ├── components/           # Shared UI components
│   │   ├── ui/              # shadcn/ui components
│   │   └── layout/          # Layout components
│   ├── lib/                 # Core utilities
│   │   ├── stores/          # Zustand stores
│   │   └── supabase.ts      # Database client
│   ├── hooks/               # Shared React hooks
│   └── types/               # Global TypeScript types
├── types/                   # Database types (generated)
├── supabase/               # Database configuration
│   └── migrations/         # SQL migrations
├── public/                 # Static assets
└── dokumentation/          # Project documentation
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:turbo        # Start with Turbo mode (faster HMR)
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run type-check       # TypeScript type checking
npm run format           # Format with Prettier
npm run validate         # Run all checks (type-check + lint + format)

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Database
npm run db:start         # Start local Supabase
npm run db:types         # Generate TypeScript types
npm run db:reset         # Reset database
npm run migration:new    # Create new migration
```

### Code Quality

- **TypeScript**: Strict mode enabled, no `any` types allowed
- **ESLint**: Enforces code standards and best practices
- **Prettier**: Automatic code formatting
- **Pre-commit hooks**: Validate code before commits

### Testing

- **Unit Tests**: Jest + React Testing Library
- **Accessibility**: jest-axe for a11y testing
- **Coverage Goal**: 80% for critical paths
- **Test Location**: Co-located with code in `__tests__` directories

## API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset-password` - Password reset

### Bingo Game Endpoints

**✅ Currently Working:**
- `GET /api/bingo` - List bingo boards
- `POST /api/bingo` - Create new board
- `GET /api/bingo/sessions` - List game sessions
- `POST /api/bingo/sessions` - Create new session
- `POST /api/bingo/sessions/join` - Join existing session
- `GET /api/bingo/sessions/players` - Get session players

**🚧 Phase 1 - In Development:**
- `POST /api/bingo/sessions/join-by-code` - Join session by code
- `PATCH /api/bingo/sessions/[id]/board-state` - Update board state
- `POST /api/bingo/sessions/[id]/mark-cell` - Mark/unmark cells real-time

### Community Endpoints

- `GET /api/discussions` - List discussions
- `POST /api/discussions` - Create discussion
- `GET /api/submissions` - List board submissions
- `POST /api/submissions` - Submit board

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables:
   - All `NEXT_PUBLIC_*` variables
   - Add production Supabase credentials
4. Deploy!

### Self-Hosted

1. Build the application:

   ```bash
   npm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   npm run start
   ```

### Database Deployment

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run migrations against production database
3. Enable Row Level Security (RLS) policies
4. Configure authentication providers

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Process

1. **Fork & Clone** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Follow the code style**:
   - Run `npm run validate` before committing
   - Write tests for new features
   - Update documentation as needed
4. **Commit with clear messages**: Use conventional commits (feat:, fix:, docs:, etc.)
5. **Push your branch** and open a Pull Request
6. **Ensure CI passes**: All tests and checks must pass

### Code Standards

- **TypeScript**: No `any` types, use proper interfaces
- **Components**: Follow existing patterns, use shadcn/ui for UI
- **State**: Use Zustand stores for global state
- **Testing**: Write tests for new features
- **Documentation**: Update relevant docs

### Getting Help

- Check existing issues and discussions
- Read the documentation in `/dokumentation`
- Ask questions in GitHub Discussions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [Supabase](https://supabase.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

<p align="center">Made with ❤️ by the Arcadia team</p>
