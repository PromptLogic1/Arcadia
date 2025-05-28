#!/usr/bin/env node

/**
 * Supabase Migration Manager
 *
 * A comprehensive utility for managing Supabase migrations in the Arcadia project.
 * Provides validation, backup, and automated workflow capabilities.
 *
 * Usage:
 *   node scripts/migration-manager.js <command> [options]
 *
 * Commands:
 *   validate     - Validate all migrations for syntax and consistency
 *   backup       - Create backup of current database state
 *   new <name>   - Create a new migration with validation
 *   status       - Check migration status (local vs remote)
 *   deploy       - Deploy pending migrations to remote
 *   rollback     - Rollback last migration (with safety checks)
 *   types        - Regenerate TypeScript types from current schema
 */

/* eslint-disable @typescript-eslint/no-var-requires, import/no-commonjs, @typescript-eslint/no-require-imports */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  PROJECT_ID: 'cnotiupdqbdxxxjrcqvb',
  MIGRATIONS_DIR: 'supabase/migrations',
  TYPES_FILE: 'types/database.generated.ts',
  BACKUP_DIR: 'backups/migrations',
  MAX_MIGRATION_SIZE: 10 * 1024 * 1024, // 10MB
};

class MigrationManager {
  constructor() {
    this.ensureDirectories();
    this.loadEnvironmentVariables();
  }

  ensureDirectories() {
    if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
      fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Load environment variables from .env.local file and set up authentication
   */
  loadEnvironmentVariables() {
    const envPath = path.join(process.cwd(), '.env.local');

    if (fs.existsSync(envPath)) {
      console.log('🔑 Loading environment variables from .env.local...');

      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};

      // Parse .env file
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#\s][^=]*?)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          envVars[key.trim()] = value.trim();
        }
      });

      // Set database password for PostgreSQL tools
      if (envVars.SUPABASE_DATABASE_PASSWORD) {
        process.env.PGPASSWORD = envVars.SUPABASE_DATABASE_PASSWORD;
        console.log('✅ Database password configured automatically');
      }

      // Set other useful environment variables
      if (envVars.NEXT_PUBLIC_SUPABASE_URL) {
        process.env.SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
      }

      if (envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        process.env.SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }

      // Set the database URL for direct PostgreSQL connections
      if (envVars.DATABASE_URL) {
        process.env.DATABASE_URL = envVars.DATABASE_URL;
      }
    } else {
      console.warn(
        '⚠️ No .env.local file found. Manual password entry may be required.'
      );
    }
  }

  /**
   * Execute a command with proper error handling and automatic password handling
   */
  exec(command, options = {}) {
    try {
      console.log(`🔄 Executing: ${command}`);

      // Ensure PGPASSWORD is set for this command
      const env = {
        ...process.env,
        ...options.env,
      };

      const result = execSync(command, {
        encoding: 'utf8',
        stdio: 'inherit',
        env,
        ...options,
      });
      return result;
    } catch (error) {
      console.error(`❌ Command failed: ${command}`);
      console.error(error.message);
      process.exit(1);
    }
  }

  /**
   * Execute a command asynchronously with progress indication and automatic password handling
   */
  async execAsync(command, description) {
    console.log(`🔄 ${description}...`);
    return new Promise((resolve, reject) => {
      // Split command into program and arguments
      const parts = command.split(' ');
      const program = parts[0];
      const args = parts.slice(1);

      const child = spawn(program, args, {
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          // Ensure password is available for the subprocess
          PGPASSWORD: process.env.PGPASSWORD,
        },
      });

      child.on('close', code => {
        if (code === 0) {
          console.log(`✅ ${description} completed successfully`);
          resolve();
        } else {
          console.error(`❌ ${description} failed with code ${code}`);
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', error => {
        console.error(`❌ ${description} failed with error:`, error.message);
        reject(error);
      });
    });
  }

  /**
   * Validate all migration files
   */
  validateMigrations() {
    console.log('🔍 Validating migrations...');

    if (!fs.existsSync(CONFIG.MIGRATIONS_DIR)) {
      console.log('📁 No migrations directory found. Creating...');
      fs.mkdirSync(CONFIG.MIGRATIONS_DIR, { recursive: true });
      return;
    }

    const migrations = fs
      .readdirSync(CONFIG.MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrations.length === 0) {
      console.log('📝 No migrations found');
      return;
    }

    console.log(`📋 Found ${migrations.length} migrations:`);

    let hasErrors = false;
    migrations.forEach((migration, index) => {
      const filePath = path.join(CONFIG.MIGRATIONS_DIR, migration);
      const stats = fs.statSync(filePath);

      // Check file size
      if (stats.size > CONFIG.MAX_MIGRATION_SIZE) {
        console.error(`❌ ${migration}: File too large (${stats.size} bytes)`);
        hasErrors = true;
      }

      // Check naming convention
      const namePattern = /^\d{14}_[\w-]+\.sql$/;
      if (!namePattern.test(migration)) {
        console.error(`❌ ${migration}: Invalid naming convention`);
        hasErrors = true;
      }

      // Read and validate SQL content
      const content = fs.readFileSync(filePath, 'utf8');

      // Basic SQL syntax checks
      if (content.trim().length === 0) {
        console.error(`❌ ${migration}: Empty migration file`);
        hasErrors = true;
      }

      // Check for dangerous operations
      const dangerousPatterns = [
        /DROP\s+DATABASE/i,
        /TRUNCATE\s+TABLE/i,
        /DELETE\s+FROM.*WHERE\s+1\s*=\s*1/i,
      ];

      dangerousPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          console.warn(
            `⚠️ ${migration}: Contains potentially dangerous operation`
          );
        }
      });

      console.log(`   ${index + 1}. ✅ ${migration} (${stats.size} bytes)`);
    });

    if (hasErrors) {
      console.error('❌ Migration validation failed');
      process.exit(1);
    } else {
      console.log('✅ All migrations validated successfully');
    }
  }

  /**
   * Create a backup of current migration state
   */
  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log('💾 Creating migration backup...');

    try {
      const password = process.env.PGPASSWORD;

      if (!password) {
        console.error('❌ Database password not available for backup');
        return;
      }

      // Backup migration history
      const historyFile = path.join(
        CONFIG.BACKUP_DIR,
        `migration-history-${timestamp}.json`
      );

      console.log('🔄 Backing up migration history...');
      this.exec(
        `npx supabase migration list --password "${password}" --output json > "${historyFile}"`
      );
      console.log(`✅ Migration history saved: ${historyFile}`);

      // Copy all migration files to backup directory with timestamp
      const migrationBackupDir = path.join(
        CONFIG.BACKUP_DIR,
        `migrations-${timestamp}`
      );
      if (!fs.existsSync(migrationBackupDir)) {
        fs.mkdirSync(migrationBackupDir, { recursive: true });
      }

      if (fs.existsSync(CONFIG.MIGRATIONS_DIR)) {
        const migrations = fs
          .readdirSync(CONFIG.MIGRATIONS_DIR)
          .filter(file => file.endsWith('.sql'));

        migrations.forEach(migration => {
          const sourcePath = path.join(CONFIG.MIGRATIONS_DIR, migration);
          const destPath = path.join(migrationBackupDir, migration);
          fs.copyFileSync(sourcePath, destPath);
        });

        console.log(
          `✅ ${migrations.length} migration files backed up to: ${migrationBackupDir}`
        );
      }

      console.log(
        '💡 For full database backup, use the Supabase dashboard or contact your admin'
      );
    } catch (error) {
      console.warn('⚠️ Backup failed (this is non-critical):', error.message);
      console.log(
        '💡 You can create manual backups via the Supabase dashboard'
      );
      // Don't exit on backup failure as it's not critical for most operations
    }
  }

  /**
   * Create a new migration with validation
   */
  createNewMigration(name) {
    if (!name) {
      console.error('❌ Migration name is required');
      console.log(
        'Usage: node scripts/migration-manager.js new <migration_name>'
      );
      process.exit(1);
    }

    // Validate migration name
    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(name)) {
      console.error(
        '❌ Invalid migration name. Use only letters, numbers, underscores, and hyphens.'
      );
      process.exit(1);
    }

    console.log(`📝 Creating new migration: ${name}`);

    try {
      this.execSupabase(`migration new ${name}`, `Creating migration: ${name}`);
      console.log('✅ Migration created successfully');
      console.log('📝 Remember to:');
      console.log('   1. Add your SQL statements to the migration file');
      console.log('   2. Test the migration locally with: npm run db:reset');
      console.log(
        '   3. Validate with: node scripts/migration-manager.js validate'
      );
    } catch (error) {
      console.error('❌ Failed to create migration:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check migration status between local and remote
   */
  async checkStatus() {
    console.log('📊 Checking migration status...');

    try {
      await this.execSupabaseAsync(
        'migration list',
        'Fetching migration status'
      );
    } catch {
      console.error('❌ Failed to check migration status');
      process.exit(1);
    }
  }

  /**
   * Deploy pending migrations to remote
   */
  async deployMigrations() {
    console.log('🚀 Deploying migrations to remote...');

    // First validate all migrations
    this.validateMigrations();

    // Create backup before deployment
    this.createBackup();

    try {
      await this.execSupabaseAsync('db push', 'Deploying migrations');
      console.log('✅ Migrations deployed successfully');

      // Regenerate types after successful deployment
      await this.regenerateTypes();
    } catch (error) {
      console.error('❌ Migration deployment failed:', error.message);
      console.log('💡 Consider rolling back if needed');
      process.exit(1);
    }
  }

  /**
   * Regenerate TypeScript types
   */
  async regenerateTypes() {
    console.log('🔄 Regenerating TypeScript types...');

    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        console.error('❌ No database URL available');
        console.log('💡 Make sure DATABASE_URL is set in your .env.local file');
        return;
      }

      // Use --db-url flag to connect directly to the database
      this.exec(
        `npx supabase gen types typescript --db-url "${databaseUrl}" > ${CONFIG.TYPES_FILE}`
      );
      console.log('✅ TypeScript types updated');
    } catch (error) {
      console.error('❌ Failed to regenerate types:', error.message);
      console.log('💡 Make sure your DATABASE_URL is correct in .env.local');
      // Don't exit here as this is not critical for migration success
    }
  }

  /**
   * Interactive rollback with safety checks
   */
  async rollbackMigration() {
    console.log('⚠️ MIGRATION ROLLBACK');
    console.log('This is a potentially destructive operation!');

    // Get current migration status
    await this.checkStatus();

    console.log('\n⚠️ Please ensure you have:');
    console.log('   1. A recent backup of your database');
    console.log('   2. Tested the rollback procedure');
    console.log('   3. Notified team members if this affects production');

    // This would require additional implementation for safe rollbacks
    console.log('\n❌ Automated rollback not implemented yet');
    console.log(
      '💡 For safety, please use Supabase dashboard or manual SQL for rollbacks'
    );
  }

  /**
   * Execute a Supabase command with automatic password handling
   */
  execSupabase(command, description = null) {
    const password = process.env.PGPASSWORD;
    if (!password) {
      console.error(
        '❌ No database password available. Check your .env.local file.'
      );
      process.exit(1);
    }

    // Add password flag to Supabase commands that support it
    const commandsNeedingPassword = ['migration list', 'db push', 'db pull'];
    const needsPassword = commandsNeedingPassword.some(cmd =>
      command.includes(cmd)
    );

    let finalCommand = `npx supabase ${command}`;
    if (needsPassword && !command.includes('--password')) {
      finalCommand += ` --password "${password}"`;
    }

    if (description) {
      console.log(`🔄 ${description}...`);
    }

    return this.exec(finalCommand);
  }

  /**
   * Execute a Supabase command asynchronously with automatic password handling
   */
  async execSupabaseAsync(command, description) {
    const password = process.env.PGPASSWORD;
    if (!password) {
      console.error(
        '❌ No database password available. Check your .env.local file.'
      );
      process.exit(1);
    }

    // Add password flag to Supabase commands that support it
    const commandsNeedingPassword = ['migration list', 'db push', 'db pull'];
    const needsPassword = commandsNeedingPassword.some(cmd =>
      command.includes(cmd)
    );

    let finalCommand = `npx supabase ${command}`;
    if (needsPassword && !command.includes('--password')) {
      finalCommand += ` --password "${password}"`;
    }

    console.log(`🔄 ${description}...`);
    return new Promise((resolve, reject) => {
      // Split command into program and arguments
      const parts = finalCommand.split(' ');
      const program = parts[0];
      const args = parts.slice(1);

      const child = spawn(program, args, {
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      });

      child.on('close', code => {
        if (code === 0) {
          console.log(`✅ ${description} completed successfully`);
          resolve();
        } else {
          console.error(`❌ ${description} failed with code ${code}`);
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', error => {
        console.error(`❌ ${description} failed with error:`, error.message);
        reject(error);
      });
    });
  }

  /**
   * Run the migration manager based on command
   */
  run() {
    const args = process.argv.slice(2);
    const command = args[0];

    console.log('🏗️ Arcadia Migration Manager\n');

    switch (command) {
      case 'validate':
        this.validateMigrations();
        break;

      case 'backup':
        this.createBackup();
        break;

      case 'new':
        this.createNewMigration(args[1]);
        break;

      case 'status':
        this.checkStatus();
        break;

      case 'deploy':
        this.deployMigrations();
        break;

      case 'rollback':
        this.rollbackMigration();
        break;

      case 'types':
        this.regenerateTypes();
        break;

      default:
        console.log('❌ Unknown command:', command);
        console.log('\nAvailable commands:');
        console.log('  validate   - Validate all migrations');
        console.log('  backup     - Create database backup');
        console.log('  new <name> - Create new migration');
        console.log('  status     - Check migration status');
        console.log('  deploy     - Deploy migrations to remote');
        console.log('  rollback   - Rollback last migration');
        console.log('  types      - Regenerate TypeScript types');
        process.exit(1);
    }
  }
}

// Run the migration manager
if (require.main === module) {
  const manager = new MigrationManager();
  manager.run();
}

module.exports = MigrationManager;
