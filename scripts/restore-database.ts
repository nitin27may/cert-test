#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface RestoreOptions {
  backupPath?: string;
  confirm?: boolean;
  dryRun?: boolean;
}

async function restoreDatabase(options: RestoreOptions = {}) {
  let backupPath = options.backupPath;
  
  // If no backup path specified, find the most recent backup
  if (!backupPath) {
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      console.error('❌ No backups directory found. Run backup first.');
      process.exit(1);
    }
    
    const backups = fs.readdirSync(backupsDir)
      .filter(dir => fs.statSync(path.join(backupsDir, dir)).isDirectory())
      .sort()
      .reverse();
    
    if (backups.length === 0) {
      console.error('❌ No backup directories found. Run backup first.');
      process.exit(1);
    }
    
    backupPath = path.join(backupsDir, backups[0]);
    console.log(`📁 Using most recent backup: ${backups[0]}`);
  }
  
  // Verify backup directory exists
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup directory not found: ${backupPath}`);
    process.exit(1);
  }
  
  // Load backup summary
  const summaryPath = path.join(backupPath, 'backup-summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error(`❌ Backup summary not found: ${summaryPath}`);
    process.exit(1);
  }
  
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  console.log(`📋 Backup Summary:`);
  console.log(`   Timestamp: ${summary.timestamp}`);
  console.log(`   Total Records: ${summary.totalRecords}`);
  console.log(`   Tables: ${summary.tables.length}`);
  
  // Show what will be restored
  console.log('\n📊 Tables to restore:');
  for (const table of summary.tables) {
    console.log(`   ${table.name}: ${table.recordCount} records`);
  }
  
  // Confirm restore (unless --confirm flag is set)
  if (!options.confirm) {
    console.log('\n⚠️  WARNING: This will overwrite existing data!');
    console.log('   Use --confirm flag to proceed without confirmation');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      rl.question('Are you sure you want to proceed? (yes/no): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Restore cancelled');
      process.exit(0);
    }
  }
  
  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made');
  }
  
  console.log('\n🔄 Starting database restore...');
  
  // Disable RLS temporarily for restore
  if (!options.dryRun) {
    console.log('🔒 Disabling RLS policies...');
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
          ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
          ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
          ALTER TABLE certification_info DISABLE ROW LEVEL SECURITY;
          ALTER TABLE user_exam_sessions DISABLE ROW LEVEL SECURITY;
          ALTER TABLE user_answers DISABLE ROW LEVEL SECURITY;
          ALTER TABLE exam_results DISABLE ROW LEVEL SECURITY;
          ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
        `
      });
    } catch (error) {
      console.log('⚠️  Could not disable RLS (this is normal in some Supabase setups)');
    }
  }
  
  // Clear existing data
  if (!options.dryRun) {
    console.log('🗑️  Clearing existing data...');
    for (const table of summary.tables) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `TRUNCATE TABLE ${table.name} CASCADE;`
        });
        console.log(`   ✅ Cleared ${table.name}`);
      } catch (error) {
        console.log(`   ⚠️  Could not clear ${table.name}: ${error}`);
      }
    }
  }
  
  // Restore data
  console.log('\n📥 Restoring data...');
  const restoreResults: any[] = [];
  
  for (const table of summary.tables) {
    try {
      const jsonPath = path.join(backupPath, table.jsonFile);
      if (!fs.existsSync(jsonPath)) {
        console.log(`   ⚠️  Skipping ${table.name}: backup file not found`);
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      
      if (data.length === 0) {
        console.log(`   ⚠️  Skipping ${table.name}: no data to restore`);
        continue;
      }
      
      if (!options.dryRun) {
        // Insert data in batches
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from(table.name)
            .insert(batch);
          
          if (error) {
            console.error(`   ❌ Error restoring ${table.name} batch ${Math.floor(i/batchSize) + 1}:`, error.message);
            break;
          }
        }
      }
      
      console.log(`   ✅ ${table.name}: ${data.length} records restored`);
      restoreResults.push({
        name: table.name,
        restored: data.length,
        expected: table.recordCount
      });
      
    } catch (error) {
      console.error(`   ❌ Failed to restore ${table.name}:`, error);
    }
  }
  
  // Re-enable RLS
  if (!options.dryRun) {
    console.log('\n🔒 Re-enabling RLS policies...');
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
          ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
          ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
          ALTER TABLE certification_info ENABLE ROW LEVEL SECURITY;
          ALTER TABLE user_exam_sessions ENABLE ROW LEVEL SECURITY;
          ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
          ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
          ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
        `
      });
    } catch (error) {
      console.log('⚠️  Could not re-enable RLS (this is normal in some Supabase setups)');
    }
  }
  
  // Verify restore
  console.log('\n🔍 Verifying restore...');
  for (const result of restoreResults) {
    try {
      const { count, error } = await supabase
        .from(result.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ⚠️  ${result.name}: Could not verify (${error.message})`);
      } else {
        const status = count === result.expected ? '✅' : '❌';
        console.log(`   ${status} ${result.name}: ${count}/${result.expected} records`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${result.name}: Verification failed`);
    }
  }
  
  console.log('\n🎉 Database restore completed!');
  
  if (options.dryRun) {
    console.log('🔍 This was a dry run - no actual changes were made');
  }
  
  return restoreResults;
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options: RestoreOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--backup-path':
        options.backupPath = args[++i];
        break;
      case '--confirm':
        options.confirm = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Database Restore Script

Usage: npm run restore:db [options]

Options:
  --backup-path <path>  Specify backup directory path
  --confirm             Skip confirmation prompt
  --dry-run            Show what would be restored without making changes
  --help               Show this help message

Examples:
  npm run restore:db                    # Restore from most recent backup
  npm run restore:db --confirm          # Skip confirmation
  npm run restore:db --dry-run         # Preview restore without changes
  npm run restore:db --backup-path ./backups/2024-01-01T10-00-00-000Z
        `);
        process.exit(0);
      default:
        console.error(`❌ Unknown option: ${args[i]}`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
  }
  
  try {
    await restoreDatabase(options);
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { restoreDatabase };
