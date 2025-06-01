#!/usr/bin/env node

/**
 * Database Schema Inspector
 * Connects to Supabase and examines the current database schema
 */

const { createClient } = require('@supabase/supabase-js');

// Database connection details
const SUPABASE_URL = 'https://cnotiupdqbdxxxjrcqvb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNub3RpdXBkcWJkeHh4anJjcXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTA4ODQsImV4cCI6MjA2Mzg2Njg4NH0.Epy3TVOBekPA-lKxm42-res4SOu-qsoQ833T5eyWAwk';

async function inspectDatabaseSchema() {
  console.log('🔍 Connecting to Supabase database...\n');

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Test connection by getting current user (this should work with anon key)
    console.log('📡 Testing connection...');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError && authError.message !== 'Invalid JWT: JWTExpired') {
      console.log('⚠️  Auth test (expected for anon key):', authError.message);
    }
    console.log('✅ Connection successful\n');

    // Get all tables in public schema
    console.log('📋 Fetching table information...\n');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .neq('table_name', 'schema_migrations')
      .order('table_name');

    if (tablesError) {
      // Try alternative method using RPC if direct access fails
      console.log('⚠️  Direct table access failed, trying RPC method...');

      // Use a direct SQL query approach
      const { data: tablesRpc, error: rpcError } = await supabase.rpc(
        'exec_sql',
        {
          sql: `
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name != 'schema_migrations'
          ORDER BY table_name;
        `,
        }
      );

      if (rpcError) {
        console.error('❌ Failed to fetch tables:', rpcError);

        // Try getting tables by attempting to query common table names
        console.log(
          '\n🔍 Attempting to discover tables by testing common names...'
        );
        const commonTableNames = [
          'users',
          'bingo_boards',
          'bingo_cards',
          'bingo_sessions',
          'bingo_session_players',
          'bingo_session_queue',
          'bingo_session_events',
          'bingo_session_cells',
          'categories',
          'challenges',
          'submissions',
          'discussions',
          'comments',
          'tags',
          'user_activity',
        ];

        const existingTables = [];
        for (const tableName of commonTableNames) {
          try {
            const { error } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);

            if (!error) {
              existingTables.push(tableName);
              console.log(`✅ Found table: ${tableName}`);
            }
          } catch (e) {
            // Table doesn't exist or no access
          }
        }

        if (existingTables.length > 0) {
          console.log(
            `\n📊 Found ${existingTables.length} tables: ${existingTables.join(', ')}\n`
          );

          // Get schema for each found table
          for (const tableName of existingTables) {
            await describeTable(supabase, tableName);
          }
        } else {
          console.log('❌ No accessible tables found');
        }
        return;
      }
    }

    if (tables && tables.length > 0) {
      console.log(`📊 Found ${tables.length} tables in public schema:\n`);

      // List all tables
      tables.forEach(table => {
        console.log(`  • ${table.table_name} (${table.table_type})`);
      });
      console.log('');

      // Get detailed schema for each table
      for (const table of tables) {
        await describeTable(supabase, table.table_name);
      }
    } else {
      console.log('❌ No tables found or insufficient permissions');
    }

    // Try to get enums
    console.log('\n🏷️  Fetching enums...\n');
    try {
      const { data: enums } = await supabase
        .from('information_schema.enum_range')
        .select('*');

      if (enums && enums.length > 0) {
        console.log('📋 Database Enums:');
        enums.forEach(enumInfo => {
          console.log(`  • ${enumInfo.enumtypid}`);
        });
      }
    } catch (e) {
      console.log('⚠️  Could not fetch enum information');
    }

    // Try to get functions
    console.log('\n⚙️  Fetching functions...\n');
    try {
      const { data: functions } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type')
        .eq('routine_schema', 'public');

      if (functions && functions.length > 0) {
        console.log('📋 Database Functions:');
        functions.forEach(func => {
          console.log(`  • ${func.routine_name} (${func.routine_type})`);
        });
      }
    } catch (e) {
      console.log('⚠️  Could not fetch function information');
    }
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
  }
}

async function describeTable(supabase, tableName) {
  try {
    console.log(`🔍 Analyzing table: ${tableName}`);

    // Get column information
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select(
        'column_name, data_type, is_nullable, column_default, character_maximum_length'
      )
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (columnsError) {
      console.log(`  ⚠️  Could not fetch column info: ${columnsError.message}`);

      // Try to get basic info by querying the table
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!sampleError && sampleData) {
        console.log(`  📊 Sample record structure:`);
        if (sampleData.length > 0) {
          Object.keys(sampleData[0]).forEach(key => {
            console.log(`    • ${key}: ${typeof sampleData[0][key]}`);
          });
        } else {
          console.log(`    (Table is empty)`);
        }
      }
    } else if (columns) {
      console.log(`  📊 Columns (${columns.length}):`);
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default
          ? ` DEFAULT ${col.column_default}`
          : '';
        const maxLength = col.character_maximum_length
          ? `(${col.character_maximum_length})`
          : '';
        console.log(
          `    • ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`
        );
      });
    }

    // Try to get constraints
    try {
      const { data: constraints } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (constraints && constraints.length > 0) {
        console.log(`  🔗 Constraints:`);
        constraints.forEach(constraint => {
          console.log(
            `    • ${constraint.constraint_name}: ${constraint.constraint_type}`
          );
        });
      }
    } catch (e) {
      // Constraints query failed, skip
    }

    console.log(''); // Empty line for readability
  } catch (error) {
    console.log(`  ❌ Error analyzing table ${tableName}:`, error.message);
  }
}

// Run the inspection
inspectDatabaseSchema()
  .then(() => {
    console.log('✅ Database schema inspection complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
