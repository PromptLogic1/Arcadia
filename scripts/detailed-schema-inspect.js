#!/usr/bin/env node

/**
 * Detailed Database Schema Inspector
 * Connects to Supabase and examines the schema in detail
 */

const { createClient } = require('@supabase/supabase-js');

// Database connection details
const SUPABASE_URL = 'https://cnotiupdqbdxxxjrcqvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNub3RpdXBkcWJkeHh4anJjcXZiIiwicm9sZUFub24iLCJpYXQiOjE3NDgyOTA4ODQsImV4cCI6MjA2Mzg2Njg4NH0.Epy3TVOBekPA-lKxm42-res4SOu-qsoQ833T5eyWAwk';

async function detailedSchemaInspection() {
  console.log('🔍 Detailed Database Schema Analysis\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test all known table names from the type definitions
  const allTableNames = [
    // Bingo tables
    'bingo_boards', 'bingo_cards', 'bingo_sessions', 'bingo_session_players', 
    'bingo_session_queue', 'bingo_session_events', 'bingo_session_cells',
    
    // User tables  
    'users', 'user_sessions', 'user_friends', 'user_achievements', 'user_activity',
    
    // Community tables
    'discussions', 'comments', 'tags', 'tag_votes', 'tag_reports', 'tag_history',
    
    // Challenge tables
    'categories', 'challenges', 'challenge_tags', 'submissions', 
    'board_bookmarks', 'board_votes', 'card_votes'
  ];

  const existingTables = [];
  const nonExistentTables = [];

  console.log('📋 Testing table existence...\n');

  for (const tableName of allTableNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error) {
        existingTables.push(tableName);
        console.log(`✅ ${tableName}`);
      } else {
        nonExistentTables.push(tableName);
        console.log(`❌ ${tableName} - ${error.message}`);
      }
    } catch (e) {
      nonExistentTables.push(tableName);
      console.log(`❌ ${tableName} - ${e.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  • Existing tables: ${existingTables.length}`);
  console.log(`  • Non-existent tables: ${nonExistentTables.length}\n`);

  console.log('🏗️  EXISTING TABLES:\n');
  console.log(`${existingTables.join(', ')}\n`);

  console.log('❌ MISSING TABLES:\n');
  console.log(`${nonExistentTables.join(', ')}\n`);

  // Detailed analysis of existing tables
  console.log('🔍 DETAILED TABLE ANALYSIS:\n');
  console.log('='.repeat(80));

  for (const tableName of existingTables) {
    await analyzeTableInDetail(supabase, tableName);
    console.log('='.repeat(80));
  }

  // Test enum values by trying to query tables with enum columns
  console.log('\n🏷️  ENUM VALUE ANALYSIS:\n');
  await analyzeEnumValues(supabase);
}

async function analyzeTableInDetail(supabase, tableName) {
  console.log(`\n📋 TABLE: ${tableName.toUpperCase()}`);
  console.log('-'.repeat(50));

  try {
    // Get all records to understand structure
    const { data: allRecords, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      console.log(`❌ Error querying table: ${error.message}`);
      return;
    }

    console.log(`📊 Total records: ${allRecords.length}`);

    if (allRecords.length > 0) {
      const firstRecord = allRecords[0];
      console.log('\n📝 Column Structure:');
      
      Object.entries(firstRecord).forEach(([key, value]) => {
        const type = typeof value;
        const isNull = value === null;
        const sample = isNull ? 'NULL' : 
                      type === 'string' ? `"${value.slice(0, 50)}${value.length > 50 ? '...' : ''}"` :
                      type === 'object' ? JSON.stringify(value).slice(0, 100) + '...' :
                      String(value);
        
        console.log(`  • ${key}: ${type}${isNull ? ' (nullable)' : ''} - ${sample}`);
      });

      // Analyze unique values for likely enum columns
      console.log('\n🔍 Potential Enum Columns:');
      for (const [key, value] of Object.entries(firstRecord)) {
        if (typeof value === 'string' && value.length < 50) {
          const uniqueValues = [...new Set(allRecords.map(record => record[key]))];
          if (uniqueValues.length <= 10 && uniqueValues.length > 1) {
            console.log(`  • ${key}: [${uniqueValues.join(', ')}]`);
          }
        }
      }

      // Show sample records
      console.log('\n📄 Sample Records (first 3):');
      allRecords.slice(0, 3).forEach((record, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(record, null, 2)}`);
      });

    } else {
      console.log('📄 Table is empty');
      
      // Try to get column info by attempting inserts that will fail
      console.log('\n🔍 Attempting to determine required columns...');
      try {
        await supabase.from(tableName).insert({});
      } catch (insertError) {
        console.log(`  Error hint: ${insertError.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ Error analyzing table: ${error.message}`);
  }
}

async function analyzeEnumValues(supabase) {
  const enumColumns = {
    'users': ['role', 'profile_visibility', 'achievements_visibility', 'submissions_visibility'],
    'bingo_cards': ['game_type', 'difficulty'],
    'challenges': ['difficulty', 'status'], 
    'discussions': ['challenge_type'],
    'tags': ['type', 'status']
  };

  for (const [tableName, columns] of Object.entries(enumColumns)) {
    try {
      const { data } = await supabase.from(tableName).select(columns.join(', '));
      if (data) {
        console.log(`\n📋 ${tableName.toUpperCase()} enums:`);
        columns.forEach(col => {
          const uniqueValues = [...new Set(data.map(record => record[col]).filter(v => v !== null))];
          if (uniqueValues.length > 0) {
            console.log(`  • ${col}: [${uniqueValues.join(', ')}]`);
          }
        });
      }
    } catch (e) {
      // Skip if table doesn't exist
    }
  }
}

// Run the detailed inspection
detailedSchemaInspection()
  .then(() => {
    console.log('\n✅ Detailed database schema inspection complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });