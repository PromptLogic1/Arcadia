#!/usr/bin/env node

/**
 * PostgreSQL Direct Database Schema Inspector
 * Connects directly to PostgreSQL and examines the schema
 */

const { Client } = require('pg');

// Extract database info from Supabase URL
const SUPABASE_URL = 'https://cnotiupdqbdxxxjrcqvb.supabase.co';
const DATABASE_PASSWORD = 'VJBUUoJb4J9tusUn';

// Parse Supabase URL to get connection details
const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = urlMatch ? urlMatch[1] : null;

if (!projectRef) {
  console.error('❌ Could not extract project reference from URL');
  process.exit(1);
}

const connectionConfig = {
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DATABASE_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
};

async function inspectPostgreSQLSchema() {
  console.log('🔍 Connecting directly to PostgreSQL database...\n');
  console.log(`Host: ${connectionConfig.host}`);
  console.log(`Database: ${connectionConfig.database}`);
  console.log(`User: ${connectionConfig.user}\n`);

  const client = new Client(connectionConfig);

  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Get all tables in public schema
    console.log('📋 Fetching all tables in public schema...\n');

    const tablesQuery = `
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name != '__schema_migrations'
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);

    if (tablesResult.rows.length > 0) {
      console.log(`📊 Found ${tablesResult.rows.length} tables:\n`);

      tablesResult.rows.forEach(table => {
        console.log(`  • ${table.table_name} (${table.table_type})`);
      });
      console.log('');

      // Get detailed schema for each table
      for (const table of tablesResult.rows) {
        await describeTableSchema(client, table.table_name);
      }
    } else {
      console.log('❌ No tables found in public schema');
    }

    // Get all enums
    console.log('\n🏷️  Fetching custom enums...\n');

    const enumsQuery = `
      SELECT 
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `;

    const enumsResult = await client.query(enumsQuery);

    if (enumsResult.rows.length > 0) {
      console.log('📋 Custom Enums:');
      enumsResult.rows.forEach(enumInfo => {
        console.log(
          `  • ${enumInfo.enum_name}: [${enumInfo.enum_values.join(', ')}]`
        );
      });
      console.log('');
    } else {
      console.log('No custom enums found\n');
    }

    // Get all functions
    console.log('⚙️  Fetching custom functions...\n');

    const functionsQuery = `
      SELECT 
        routine_name,
        routine_type,
        data_type as return_type
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      AND routine_name NOT LIKE 'pg_%'
      ORDER BY routine_name;
    `;

    const functionsResult = await client.query(functionsQuery);

    if (functionsResult.rows.length > 0) {
      console.log('📋 Custom Functions:');
      functionsResult.rows.forEach(func => {
        console.log(
          `  • ${func.routine_name}() -> ${func.return_type} (${func.routine_type})`
        );
      });
      console.log('');
    } else {
      console.log('No custom functions found\n');
    }

    // Get indexes
    console.log('🔍 Fetching indexes...\n');

    const indexesQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    const indexesResult = await client.query(indexesQuery);

    if (indexesResult.rows.length > 0) {
      console.log('📋 Indexes:');
      indexesResult.rows.forEach(idx => {
        console.log(`  • ${idx.tablename}.${idx.indexname}`);
        console.log(`    ${idx.indexdef}`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);

    // Provide helpful debugging info
    if (error.code === 'ENOTFOUND') {
      console.log('\n🔍 Debugging info:');
      console.log('  • Check if the Supabase project reference is correct');
      console.log('  • Verify the host format: db.<project-ref>.supabase.co');
    } else if (error.code === '28P01') {
      console.log('\n🔍 Authentication failed:');
      console.log('  • Check if the database password is correct');
      console.log('  • Verify the username is "postgres"');
    }
  } finally {
    await client.end();
  }
}

async function describeTableSchema(client, tableName) {
  console.log(`🔍 Table: ${tableName.toUpperCase()}`);
  console.log('-'.repeat(60));

  try {
    // Get column information
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position;
    `;

    const columnsResult = await client.query(columnsQuery, [tableName]);

    if (columnsResult.rows.length > 0) {
      console.log('📊 Columns:');
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default
          ? ` DEFAULT ${col.column_default}`
          : '';
        let dataType = col.data_type;

        if (col.character_maximum_length) {
          dataType += `(${col.character_maximum_length})`;
        } else if (col.numeric_precision) {
          dataType += `(${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ''})`;
        }

        console.log(
          `  • ${col.column_name}: ${dataType} ${nullable}${defaultVal}`
        );
      });
    }

    // Get constraints
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
      ORDER BY tc.constraint_type, tc.constraint_name;
    `;

    const constraintsResult = await client.query(constraintsQuery, [tableName]);

    if (constraintsResult.rows.length > 0) {
      console.log('🔗 Constraints:');
      constraintsResult.rows.forEach(constraint => {
        let constraintInfo = `  • ${constraint.constraint_name}: ${constraint.constraint_type}`;
        if (constraint.column_name) {
          constraintInfo += ` (${constraint.column_name})`;
        }
        if (constraint.foreign_table_name) {
          constraintInfo += ` -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`;
        }
        console.log(constraintInfo);
      });
    }

    // Get row count
    const countQuery = `SELECT COUNT(*) as count FROM "${tableName}";`;
    const countResult = await client.query(countQuery);
    console.log(`📈 Row count: ${countResult.rows[0].count}`);

    console.log(''); // Empty line for readability
  } catch (error) {
    console.log(`❌ Error analyzing table ${tableName}: ${error.message}\n`);
  }
}

// Run the inspection
inspectPostgreSQLSchema()
  .then(() => {
    console.log('✅ PostgreSQL database schema inspection complete');
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
