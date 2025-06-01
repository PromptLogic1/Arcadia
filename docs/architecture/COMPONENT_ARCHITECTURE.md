# 🏗️ Component Architecture

_Frontend component structure and patterns for the Arcadia Gaming Platform_

## 📁 **Directory Structure**

```
src/
├── app/                    # Next.js App Router
│   ├── (routes)/          # Page routes
│   ├── api/               # API endpoints
│   └── layout.tsx         # Root layout
│
├── features/              # Feature-based modules
│   ├── auth/             # Authentication
│   ├── bingo-boards/     # Core gaming
│   ├── community/        # Social features
│   ├── settings/         # User settings
│   └── user/             # User profiles
│
├── components/           # Shared UI components
│   ├── ui/              # Base UI (Shadcn)
│   └── layout/          # Layout components
│
├── lib/                 # Core utilities
│   ├── stores/          # Zustand stores
│   └── supabase.ts      # Database client
│
├── hooks/               # Shared hooks
└── types/               # Global types
```

## 🎨 **Component Patterns**

### **Feature-Based Organization**

Each feature is self-contained with:

```
feature/
├── components/       # Feature-specific components
├── hooks/           # Feature-specific hooks
├── types/           # Feature types
├── services/        # API/business logic
└── index.ts         # Public exports
```

### **Component Structure**

```typescript
// components/MyComponent.tsx
'use client';  // Only if needed

import { ComponentProps } from '@/types';

interface MyComponentProps extends ComponentProps {
  // Specific props
}

export function MyComponent({
  className,
  ...props
}: MyComponentProps) {
  // Component logic
  return (
    <div className={cn('base-styles', className)}>
      {/* Content */}
    </div>
  );
}
```

## 🧩 **UI Component Library**

### **Base Components (Shadcn/ui)**

Located in `/components/ui/`:

- **Forms**: `input`, `select`, `checkbox`, `form-field`
- **Layout**: `card`, `dialog`, `tabs`, `accordion`
- **Feedback**: `toast`, `alert-dialog`, `loading-spinner`
- **Navigation**: `button`, `dropdown-menu`, `command`
- **Display**: `avatar`, `badge`, `skeleton`

### **Unified Form Components**

```typescript
// CVA-based form field with variants
<FormField
  variant="default" // default | ghost | destructive
  size="md"        // sm | md | lg
  state="default"  // default | error | success
>
  <Input {...field} />
</FormField>

// Form message component
<FormMessage
  type="error"    // error | warning | info | success
  variant="default" // default | inline | toast
>
  Error message here
</FormMessage>
```

### **Gaming-Specific Components**

```typescript
// Neon-styled gaming components
<NeonButton variant="primary" glow>
  Start Game
</NeonButton>

<NeonBorder color="#00ff00">
  <Card>Content</Card>
</NeonBorder>

<ArcadeDecoration position="top-left" />
```

## 🎮 **Feature Components**

### **Bingo Boards**

```
bingo-boards/components/
├── BingoBoardsHub.tsx      # Main hub page
├── Board/                  # Board display
│   ├── BoardGrid.tsx
│   ├── BoardCell.tsx
│   └── WinnerModal.tsx
├── Generator/              # Board generator
│   ├── GeneratorPanel.tsx
│   ├── TagSelector.tsx
│   └── DifficultySelector.tsx
├── game-controls/          # In-game controls
│   ├── GameSettings.tsx
│   ├── PlayerManagement.tsx
│   └── TimerControls.tsx
└── layout/                 # Layout components
    └── BingoLayout.tsx
```

### **Authentication**

```
auth/components/
├── LoginForm.tsx           # Complete login form
├── SignUpForm.tsx          # Registration form
├── LoginFormFields.tsx     # Form field components
├── LoginOAuthSection.tsx   # OAuth providers
└── AuthGuard.tsx          # Route protection
```

### **Community**

```
community/components/
├── community.tsx           # Main community page
├── DiscussionCard.tsx      # Discussion display
├── CreateDiscussionForm.tsx # New discussion
├── EventCard.tsx           # Event display
└── CommunityFilters.tsx    # Filter controls
```

## 🔄 **State Management**

### **Zustand Stores**

Global state management in `/lib/stores/`:

```typescript
// Example store structure
interface BingoBoardsStore {
  // State
  boards: Board[];
  loading: boolean;

  // Actions
  fetchBoards: () => Promise<void>;
  createBoard: (data: CreateBoardData) => Promise<Board>;
  updateBoard: (id: string, data: UpdateBoardData) => Promise<void>;
}
```

### **Context Providers**

Feature-specific context for complex state:

```typescript
// BingoGameContext for multiplayer state
<BingoGameProvider sessionId={sessionId}>
  <GameBoard />
  <PlayerList />
  <GameControls />
</BingoGameProvider>
```

## 🪝 **Hook Architecture**

### **Data Fetching Hooks**

```typescript
// Pattern for data hooks
export function useBoards() {
  const { boards, loading, error, fetchBoards } = useBingoBoardsStore();

  useEffect(() => {
    fetchBoards();
  }, []);

  return { boards, loading, error };
}
```

### **Real-time Hooks**

```typescript
// Pattern for real-time subscriptions
export function useBingoGame(sessionId: string) {
  const [state, setState] = useState();

  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          /* config */
        },
        handleUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { state /* methods */ };
}
```

### **UI State Hooks**

```typescript
// Common UI patterns
export function useDebounce<T>(value: T, delay: number): T;
export function useVirtualList(
  items: T[],
  containerRef: RefObject<HTMLElement>
);
export function useErrorHandler(): { error; setError; clearError };
```

## 🎯 **Best Practices**

### **Component Guidelines**

1. **Server Components by Default**: Use client components only when needed
2. **Composition over Props**: Break down complex components
3. **Type Safety**: Full TypeScript coverage, no `any`
4. **Accessibility**: ARIA labels, keyboard navigation
5. **Performance**: Memoization, lazy loading, virtualization

### **Styling Patterns**

```typescript
// Use Tailwind with cn() utility
import { cn } from '@/lib/utils';

<div className={cn(
  'base-styles',
  variant === 'primary' && 'primary-styles',
  className
)} />

// CVA for complex variants
const buttonVariants = cva(
  'base-button-styles',
  {
    variants: {
      variant: {
        default: 'default-styles',
        destructive: 'destructive-styles',
      },
      size: {
        sm: 'small-styles',
        md: 'medium-styles',
      }
    }
  }
);
```

### **Testing Approach**

```typescript
// Co-located test files
MyComponent.tsx
MyComponent.test.tsx

// Focus on user behavior
test('marks cell when clicked', async () => {
  const user = userEvent.setup();
  render(<BingoCell />);

  await user.click(screen.getByRole('button'));

  expect(screen.getByRole('button')).toHaveClass('marked');
});
```

## 📚 **Component Documentation**

### **Props Documentation**

```typescript
interface ComponentProps {
  /** Primary content */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Visual variant */
  variant?: 'default' | 'primary' | 'secondary';

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Loading state */
  loading?: boolean;

  /** Disabled state */
  disabled?: boolean;
}
```

### **Usage Examples**

```typescript
// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="primary" size="lg">
  Start Game
</Button>

// With state
<Button loading disabled={!canSubmit}>
  Submit
</Button>
```

## 🔗 **Related Documentation**

- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) - Data structure
- [`HOOK_REFERENCE.md`](../HOOK_REFERENCE.md) - Hook documentation
- [`MULTIPLAYER_GUIDE.md`](../MULTIPLAYER_GUIDE.md) - Real-time features
