/**
 * PlayArea Feature Unit Tests
 * 
 * This directory contains extracted business logic tests from E2E tests.
 * These unit tests focus on testing the core algorithms and calculations
 * without browser dependencies.
 */

// Game Logic Tests
export * from './games/game-filters.test';

// Achievement System Tests  
export * from './achievements/achievement-engine.test';
export * from './achievements/progress-tracker.test';

// Recommendation System Tests
export * from './recommendations/recommendation.test';

// Speedrun System Tests
export * from './speedruns/speedrun-timer.test';

/**
 * Test Organization:
 * 
 * 📁 games/
 *   - game-filters.test.ts - Game filtering algorithms and search logic
 * 
 * 📁 achievements/
 *   - achievement-engine.test.ts - Achievement unlock logic and validation
 *   - progress-tracker.test.ts - User progress tracking and statistics
 * 
 * 📁 recommendations/
 *   - recommendation.test.ts - Game recommendation algorithms
 * 
 * 📁 speedruns/
 *   - speedrun-timer.test.ts - High-precision timer logic and anti-cheat
 * 
 * Coverage Areas:
 * ✅ Filtering algorithms with large datasets
 * ✅ Achievement calculations and progress tracking  
 * ✅ Recommendation engine with collaborative filtering
 * ✅ Timer precision and validation
 * ✅ Performance testing with 1000+ items
 * ✅ Edge cases and error handling
 */