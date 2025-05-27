# Database Types Structure

This directory contains the TypeScript type definitions for our Supabase database in a modular structure for better maintainability.

## File Structure

```
types/
├── database.core.ts      # Core types, enums, and composite types
├── database.bingo.ts     # Bingo-related table types
├── database.users.ts     # User and community-related table types
├── database.challenges.ts # Challenges and other table types
├── database.types.ts     # Main file that combines everything
└── README.md            # This documentation
```

## Files Overview

### `database.core.ts`
Contains:
- `Json` type definition
- All database enums (DifficultyLevel, GameCategory, etc.)
- Composite types (BoardCell, BoardSettings, etc.)
- Constants object with enum values

### `database.bingo.ts`
Contains all bingo-related table types:
- BingoBoardsTable
- BingoCardsTable
- BingoSessionsTable
- BingoSessionPlayersTable
- BingoSessionEventsTable
- BingoSessionCellsTable
- BingoSessionQueueTable

### `database.users.ts`
Contains user and community-related table types:
- UsersTable
- UserSessionsTable
- UserFriendsTable
- UserAchievementsTable
- DiscussionsTable
- CommentsTable
- TagsTable and related tables

### `database.challenges.ts`
Contains challenge and other table types:
- CategoriesTable
- ChallengesTable
- SubmissionsTable
- BoardBookmarksTable
- BoardVotesTable
- CardVotesTable

### `database.types.ts`
Main export file that:
- Re-exports all core types
- Combines all table interfaces into the main Database interface
- Provides helper types (Tables, TablesInsert, TablesUpdate, etc.)
- Exports Constants for easy access to enum values

## Usage

Import types from the main file:

```typescript
import type { 
  Database, 
  Tables, 
  GameCategory, 
  DifficultyLevel,
  BoardCell 
} from '@/types/database.types'

// Use Tables helper for easy table row access
type User = Tables<'users'>
type BingoBoard = Tables<'bingo_boards'>

// Use enum types
const category: GameCategory = "World of Warcraft"
const difficulty: DifficultyLevel = "medium"

// Access enum constants
import { Constants } from '@/types/database.types'
const allCategories = Constants.public.Enums.game_category
```

## Maintenance

### When Database Schema Changes

1. **Generate new types for reference:**
   ```bash
   npm run db:types:generate
   ```
   This creates `database.generated.ts` with the latest Supabase types.

2. **Update the modular files:**
   - Compare the generated types with existing modular files
   - Update the relevant modular files (core, bingo, users, challenges)
   - Ensure the main `database.types.ts` includes all new tables

3. **Test the changes:**
   ```bash
   npm run type-check
   ```

### Adding New Tables

1. Determine which modular file the new table belongs to
2. Add the table interface to the appropriate file
3. Update the main `Database` interface in `database.types.ts`
4. Update imports in the main file if needed

### Benefits of This Structure

- **Maintainability**: Easier to find and update specific table types
- **Performance**: Smaller files load faster in IDEs
- **Organization**: Related tables are grouped together
- **Scalability**: Easy to add new modules as the schema grows
- **Type Safety**: Full TypeScript support with proper relationships

## Best Practices

1. **Always import from the main file** (`database.types.ts`) in application code
2. **Use the Tables helper type** instead of the full Database path
3. **Use enum types** from core instead of hardcoded strings
4. **Use Constants** for accessing enum values in runtime code
5. **Keep the modular structure** when adding new types 