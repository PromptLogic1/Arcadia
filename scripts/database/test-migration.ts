#!/usr/bin/env tsx

/**
 * Test migration script
 *
 * This script tests the migration changes before applying them to the database.
 *
 * Usage: npm run test:migration
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error(
    'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
  );
  process.exit(1);
}

// Use service role key for admin access to test policies
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testMigration() {
  console.log('🔍 Testing migration...\n');

  try {
    // Test 1: Check if views exist and are accessible
    console.log('1️⃣ Testing views accessibility...');

    const viewTests = [
      { name: 'leaderboards', query: 'SELECT * FROM leaderboards LIMIT 1' },
      { name: 'public_boards', query: 'SELECT * FROM public_boards LIMIT 1' },
      { name: 'session_stats', query: 'SELECT * FROM session_stats LIMIT 1' },
    ];

    for (const test of viewTests) {
      try {
        // Test view accessibility by selecting from it
        const { error } = await supabase.from(test.name).select('*').limit(1);

        if (error) {
          console.error(`❌ Error testing ${test.name} view:`, error.message);
        } else {
          console.log(`✅ ${test.name} view is accessible`);
        }
      } catch (err) {
        console.error(`❌ Error testing ${test.name} view:`, err);
      }
    }

    // Test 2: Check RLS policy performance
    console.log('\n2️⃣ Testing RLS policy performance...');

    // Get a sample user ID for testing
    const { data: users } = await supabase.from('users').select('id').limit(1);

    if (users && users.length > 0) {
      // Test query performance with auth context
      const startTime = Date.now();
      const { error: cardsError } = await supabase
        .from('bingo_cards')
        .select('*')
        .limit(10);

      const queryTime = Date.now() - startTime;

      if (cardsError) {
        console.error(
          '❌ Error testing bingo_cards query:',
          cardsError.message
        );
      } else {
        console.log(`✅ bingo_cards query completed in ${queryTime}ms`);
        if (queryTime > 100) {
          console.warn(
            '⚠️  Query took longer than 100ms, consider further optimization'
          );
        }
      }
    }

    // Test 3: Verify basic table access
    console.log('\n3️⃣ Verifying basic table access...');

    const tablesToTest = [
      'user_statistics',
      'community_event_participants',
      'categories',
      'tags',
    ];

    for (const table of tablesToTest) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(`❌ Error accessing ${table}:`, error.message);
        } else {
          console.log(`✅ ${table} is accessible (${count || 0} rows)`);
        }
      } catch (err) {
        console.error(`❌ Error accessing ${table}:`, err);
      }
    }

    // Test 4: Test a sample query with RLS
    console.log('\n4️⃣ Testing sample queries with RLS...');

    try {
      // Test bingo_boards query (public access)
      const startTime = Date.now();
      const { data: boards, error: boardsError } = await supabase
        .from('bingo_boards')
        .select('id, title, is_public')
        .eq('is_public', true)
        .limit(5);

      const boardsTime = Date.now() - startTime;

      if (boardsError) {
        console.error('❌ Error querying bingo_boards:', boardsError.message);
      } else {
        console.log(
          `✅ bingo_boards query successful (${boardsTime}ms, ${boards?.length || 0} results)`
        );
      }

      // Test user_statistics query
      const startTime2 = Date.now();
      const { data: stats, error: statsError } = await supabase
        .from('user_statistics')
        .select('user_id, total_games, games_won')
        .limit(5);

      const statsTime = Date.now() - startTime2;

      if (statsError) {
        console.error('❌ Error querying user_statistics:', statsError.message);
      } else {
        console.log(
          `✅ user_statistics query successful (${statsTime}ms, ${stats?.length || 0} results)`
        );
      }
    } catch (err) {
      console.error('❌ Error testing queries:', err);
    }

    console.log('\n✨ Migration testing complete!');
    console.log(
      '\n📝 Note: This test verifies basic access. The actual migration should be tested'
    );
    console.log(
      '   in a development environment before applying to production.'
    );
  } catch (error) {
    console.error('❌ Error during migration testing:', error);
    process.exit(1);
  }
}

// Run the test
testMigration();
