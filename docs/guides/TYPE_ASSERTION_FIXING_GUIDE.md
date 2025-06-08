# Type Assertion Fixing Guide

This guide provides comprehensive best practices for removing type assertions in TypeScript/React/Next.js projects, based on official TypeScript documentation and TypeScript-ESLint recommendations.

## Core Principle

**The only allowed type assertion is `as const`**. All other type assertions (`as Type`) should be replaced with proper type guards, type predicates, or type-safe alternatives.

## Common Patterns and Solutions

### 1. Error Handling Without Type Assertions

#### ❌ Bad - Type Assertion

```typescript
try {
  // some code
} catch (error) {
  logger.error('Failed', error as Error);
}
```

#### ✅ Good - Type Guard Function

```typescript
// Create a type-safe error conversion function
export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'string') {
    return new Error(value);
  }

  if (value && typeof value === 'object' && 'message' in value) {
    return new Error(String(value.message));
  }

  return new Error(String(value));
}

// Usage
try {
  // some code
} catch (error) {
  logger.error('Failed', toError(error));
}
```

### 2. Type Guards Instead of Assertions

#### ❌ Bad

```typescript
const data = JSON.parse(rawData) as UserData;
```

#### ✅ Good - Type Predicate

```typescript
function isUserData(value: unknown): value is UserData {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    'name' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  );
}

const data = JSON.parse(rawData);
if (!isUserData(data)) {
  throw new Error('Invalid user data format');
}
// data is now typed as UserData
```

### 3. Assertion Functions for Type Narrowing

```typescript
// Define assertion functions
function assert(condition: boolean): asserts condition {
  if (!condition) {
    throw new Error('Assertion failed');
  }
}

function assertDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error('Value is null or undefined');
  }
}

// Usage
function processValue(x: string | undefined) {
  assertDefined(x);
  // x is now typed as string
  console.log(x.length);
}
```

### 4. React Component Type Safety

#### ❌ Bad

```typescript
const MyComponent = (props: unknown) => {
  const typedProps = props as MyComponentProps;
  return <div>{typedProps.title}</div>;
};
```

#### ✅ Good

```typescript
const MyComponent: React.FC<MyComponentProps> = (props) => {
  // props is already typed correctly
  return <div>{props.title}</div>;
};
```

### 5. API Response Validation with Zod

#### ❌ Bad

```typescript
const response = await fetch('/api/users');
const users = (await response.json()) as User[];
```

#### ✅ Good

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const UsersSchema = z.array(UserSchema);

const response = await fetch('/api/users');
const data = await response.json();
const users = UsersSchema.parse(data); // Throws if invalid
```

### 6. Generic Storage Patterns

When dealing with generic storage (like cache), consider these approaches:

#### Option 1: Result Type Pattern

```typescript
type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; data: null; error: string };

class Cache {
  private storage = new Map<string, unknown>();

  set<T>(key: string, value: T): void {
    this.storage.set(key, value);
  }

  get<T>(key: string): ValidationResult<T> {
    const value = this.storage.get(key);
    if (value === undefined) {
      return { success: false, data: null, error: 'Not found' };
    }
    // Return unknown data - consumer knows the expected type
    return { success: true, data: value as T };
  }
}
```

#### Option 2: Type-Specific Caches

```typescript
class TypedCache<T> {
  private storage = new Map<string, T>();

  set(key: string, value: T): void {
    this.storage.set(key, value);
  }

  get(key: string): T | null {
    return this.storage.get(key) ?? null;
  }
}

// Usage
const userCache = new TypedCache<User>();
const configCache = new TypedCache<Config>();
```

### 7. Working with `unknown` Type

#### ❌ Bad - Using `any`

```typescript
function processData(data: any) {
  return data.value; // Unsafe
}
```

#### ✅ Good - Type Narrowing

```typescript
function processData(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof data.value === 'string'
  ) {
    return data.value; // Safe
  }
  throw new Error('Invalid data format');
}
```

### 8. The Only Allowed Assertion: `as const`

```typescript
// ✅ Allowed - as const for literal types
const config = {
  api: '/api/v1',
  timeout: 5000,
} as const;

const tuple = [1, 2, 3] as const;

const action = 'UPDATE_USER' as const;
```

## TypeScript-ESLint Rules to Enable

Add these rules to your ESLint configuration to enforce type safety:

```javascript
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unnecessary-type-assertion": "error",
  "@typescript-eslint/consistent-type-assertions": [
    "error",
    {
      "assertionStyle": "never"
    }
  ]
}
```

## Migration Strategy

1. **Start with utility functions**: Create type guards and conversion functions first
2. **Fix errors systematically**: Use `toError()` for all error handling
3. **Add validation at boundaries**: Validate all external data (API responses, user input)
4. **Use Zod schemas**: Define schemas for all data structures
5. **Enable strict TypeScript**: Ensure `strict: true` in tsconfig.json
6. **Run type checking**: Use `tsc --noEmit` to verify no type errors

## Special Cases

### When Type Assertions Might Be Acceptable

In very rare cases, a single type assertion might be acceptable if:

1. It's in low-level utility/infrastructure code
2. It's well-documented with explanation
3. It's isolated to the smallest possible scope
4. There's no reasonable alternative
5. It's converting from `unknown` after proper validation

Example:

```typescript
// In a generic cache utility where we've validated but TypeScript can't infer
class Cache {
  get<T>(key: string): T | null {
    const entry = this.storage.get(key);
    if (!entry || !this.isValid(entry)) {
      return null;
    }
    // Single assertion after validation, documented
    // TypeScript cannot infer T from unknown storage
    return entry.data as T;
  }
}
```

## Common Pitfalls to Avoid

1. **Don't cascade type assertions**: One assertion often leads to many
2. **Don't assert to `any`**: Use `unknown` and narrow the type
3. **Don't skip validation**: Always validate external data
4. **Don't assert in business logic**: Keep assertions in utilities only
5. **Don't ignore TypeScript errors**: Fix them properly instead

## Resources

- [TypeScript Handbook - Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript-ESLint - Type Safety Rules](https://typescript-eslint.io/rules/#type-checking)
- [Zod - TypeScript-first schema validation](https://zod.dev/)

## Summary

Removing type assertions makes your code:

- **Safer**: Catches errors at compile time
- **More maintainable**: Types document intent
- **More refactorable**: TypeScript helps with changes
- **More reliable**: Fewer runtime surprises

Remember: If you need a type assertion, first ask "How can I prove to TypeScript that this is the correct type?" The answer is usually a type guard or validation function.
