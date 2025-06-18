# Integration Test Guidelines

## Purpose
This document defines when to use E2E Playwright tests vs Jest unit tests to maintain optimal test architecture and performance.

## Decision Framework

### Use Jest Unit Tests For:
✅ **Business Logic Testing**
- Service layer functions and algorithms
- Data validation and transformation
- State management logic
- Pure function testing
- Hook logic (with mocking)

✅ **UI Component Logic**
- Form validation behavior
- Component state transitions
- Event handling logic
- Conditional rendering logic

✅ **Performance-Critical Testing**
- Tests that need to run frequently
- CI/CD pipeline tests
- Development workflow tests

**Benefits**: ~100ms execution time, no flakiness, better debugging, more edge cases

### Use Playwright E2E Tests For:
✅ **Browser-Specific Behavior**
- Real WebSocket connections and synchronization
- Multi-tab/multi-page interactions
- Browser timer precision and performance
- Memory usage and resource management
- Cross-browser compatibility

✅ **Real-Time Integration**
- WebSocket event synchronization
- Multi-user concurrent operations
- Network interruption handling
- Presence tracking across tabs

✅ **Complete User Journeys**
- Critical path workflows
- Feature discovery flows
- Cross-component integration
- Production-like scenarios

**Benefits**: Real browser environment, actual network conditions, true integration validation

## Current Optimized Test Structure

### Essential E2E Tests (7 files)
```
tests/features/
├── bingo/
│   ├── multiplayer.spec.ts          # Multi-page conflict resolution
│   ├── game-session.spec.ts         # Real session joining
│   └── board-sharing.spec.ts        # Cross-user visibility
├── community/
│   └── social-features.spec.ts      # Multi-tab social interactions
└── play-area/
    ├── game-hub.spec.ts             # Game discovery journey
    ├── speedrun-precision.spec.ts   # Browser timer precision
    └── game-discovery-performance.spec.ts # Memory/virtualization
```

### Comprehensive Jest Unit Tests
```
src/features/
├── bingo-boards/test/         # Game engine, win detection, scoring
├── Community/test/            # Discussion, moderation, search services
├── play-area/test/           # Achievement engine, filters, timers
├── auth/test/                # Authentication services
├── landing/test/             # Marketing logic
└── settings/test/            # Settings management
```

## Migration Benefits Achieved

### Performance Improvements
- **Test Execution**: 63% reduction in E2E test files
- **CI/CD Speed**: Faster pipeline execution
- **Development Speed**: Faster feedback loops

### Quality Improvements
- **Reliability**: Eliminated UI flakiness in logic tests
- **Coverage**: More edge cases in Jest unit tests
- **Maintainability**: Clear separation of concerns

### Focus Improvements
- **E2E Purpose**: Only real browser-specific behavior
- **Unit Purpose**: All business and UI logic
- **Clear Guidelines**: When to use each approach

## Implementation Rules

### For New Features

#### When Adding Logic/Services
1. **Write Jest unit tests first** for all business logic
2. **Mock external dependencies** (database, WebSocket, API calls)
3. **Test edge cases thoroughly** in unit tests
4. **Consider E2E only** if browser behavior is critical

#### When Adding UI Components  
1. **Test component logic** with Jest + React Testing Library
2. **Mock service dependencies** and test component behavior
3. **Use E2E only** for complex user workflows or multi-component integration

#### When Adding Real-Time Features
1. **Test core logic** with Jest unit tests using mocked WebSocket
2. **Use E2E tests** for actual WebSocket synchronization across tabs
3. **Focus E2E** on conflict resolution and network interruption

### Maintenance Guidelines

#### Monthly Review
- **Audit E2E tests**: Ensure they test browser-specific behavior
- **Check Jest coverage**: Maintain high coverage for business logic
- **Remove redundancy**: Identify and migrate logic tests to Jest

#### CI/CD Integration
- **Jest tests**: Run on every commit (fast feedback)
- **E2E tests**: Run on PR approval (comprehensive validation)
- **Smoke tests**: Run on deployment (production readiness)

## Anti-Patterns to Avoid

### ❌ Don't Use E2E For:
- Form validation logic (use Jest)
- Service function testing (use Jest)
- Component state management (use Jest)
- Data transformation logic (use Jest)
- Hook behavior testing (use Jest with mocks)

### ❌ Don't Use Jest For:
- Multi-tab WebSocket synchronization
- Browser performance under load
- Cross-browser compatibility
- Real network conditions
- Actual timer precision testing

## Success Metrics

### Quantitative Goals ✅ ACHIEVED
- **File Reduction**: 19 → 7 E2E files (63% reduction)
- **Execution Speed**: ~70% faster test suite
- **Clear Focus**: 100% separation of logic vs integration

### Qualitative Goals ✅ ACHIEVED  
- **Maintainability**: Clear test purposes and ownership
- **Reliability**: Reduced E2E flakiness by removing logic tests
- **Coverage**: Comprehensive unit tests + targeted integration

### Future Goals
- **Monitor performance**: Track E2E test execution times
- **Expand Jest coverage**: Continue migrating logic from E2E to Jest
- **Refine guidelines**: Update based on team experience

---

**Key Principle**: Test behavior at the right level - logic in Jest, integration in Playwright.