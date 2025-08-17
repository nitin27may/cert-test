#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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

interface ResetOptions {
  confirm?: boolean;
  dryRun?: boolean;
  backupFirst?: boolean;
}

async function resetDatabase(options: ResetOptions = {}) {
  console.log('🔄 Database Reset Script');
  console.log('========================');
  
  // Show what will be reset
  const tablesToReset = [
    'exams',
    'topics', 
    'topic_modules',
    'questions',
    'certification_info',
    'user_exam_sessions',
    'session_questions',
    'user_answers',
    'exam_results',
    'user_preferences',
    'audit_log',
    'rate_limits'
  ];
  
  console.log('\n📊 Tables that will be reset:');
  for (const table of tablesToReset) {
    console.log(`   ${table}`);
  }
  
  // Confirm reset (unless --confirm flag is set)
  if (!options.confirm) {
    console.log('\n⚠️  WARNING: This will DELETE ALL DATA from the database!');
    console.log('   This action cannot be undone!');
    console.log('   Use --confirm flag to proceed without confirmation');
    
    if (options.backupFirst) {
      console.log('\n💾 Creating backup before reset...');
      try {
        const { createBackup } = require('./backup-database');
        await createBackup();
      } catch (error) {
        console.log('⚠️  Backup failed, but continuing with reset...');
      }
    }
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      rl.question('Are you absolutely sure you want to proceed? Type "RESET" to confirm: ', resolve);
    });
    rl.close();
    
    if (answer !== 'RESET') {
      console.log('❌ Reset cancelled');
      process.exit(0);
    }
  }
  
  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made');
  }
  
  console.log('\n🔄 Starting database reset...');
  
  // Disable RLS temporarily for reset
  if (!options.dryRun) {
    console.log('🔒 Disabling RLS policies...');
    try {
      for (const table of tablesToReset) {
        try {
          await supabase.rpc('exec_sql', {
            sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
          });
        } catch (error) {
          // Ignore errors for tables that might not exist yet
        }
      }
    } catch (error) {
      console.log('⚠️  Could not disable RLS (this is normal in some Supabase setups)');
    }
  }
  
  // Reset tables
  console.log('\n🗑️  Resetting tables...');
  const resetResults: any[] = [];
  
  for (const table of tablesToReset) {
    try {
      if (!options.dryRun) {
        // Check if table exists
        const { data: tableExists } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (tableExists !== null) {
          // Clear all data
          const { error } = await supabase.rpc('exec_sql', {
            sql: `TRUNCATE TABLE ${table} CASCADE;`
          });
          
          if (error) {
            console.log(`   ⚠️  Could not reset ${table}: ${error.message}`);
            continue;
          }
        }
      }
      
      console.log(`   ✅ ${table}: Reset`);
      resetResults.push({ name: table, status: 'reset' });
      
    } catch (error) {
      console.log(`   ⚠️  Could not reset ${table}: ${error}`);
      resetResults.push({ 
        name: table, 
        status: 'failed', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  // Re-enable RLS
  if (!options.dryRun) {
    console.log('\n🔒 Re-enabling RLS policies...');
    try {
      for (const table of tablesToReset) {
        try {
          await supabase.rpc('exec_sql', {
            sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
          });
        } catch (error) {
          // Ignore errors for tables that might not exist yet
        }
      }
    } catch (error) {
      console.log('⚠️  Could not re-enable RLS (this is normal in some Supabase setups)');
    }
  }
  
  // Verify reset
  console.log('\n🔍 Verifying reset...');
  for (const result of resetResults) {
    if (result.status === 'reset') {
      try {
        const { count, error } = await supabase
          .from(result.name)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ⚠️  ${result.name}: Could not verify (${error.message})`);
        } else {
          const status = count === 0 ? '✅' : '❌';
          console.log(`   ${status} ${result.name}: ${count} records (should be 0)`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${result.name}: Verification failed`);
      }
    } else {
      console.log(`   ⚠️  ${result.name}: Skipped (${result.status})`);
    }
  }
  
  console.log('\n🎉 Database reset completed!');
  
  if (options.dryRun) {
    console.log('🔍 This was a dry run - no actual changes were made');
  } else {
    console.log('\n📋 Next steps:');
    console.log('   1. Run schema setup: npm run setup:db');
    console.log('   2. Or run migration: npm run migrate:exam-data');
    console.log('   3. Verify data is restored correctly');
  }
  
  return resetResults;
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options: ResetOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--confirm':
        options.confirm = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--backup-first':
        options.backupFirst = true;
        break;
      case '--help':
        console.log(`
Database Reset Script

Usage: npm run reset:db [options]

Options:
  --confirm        Skip confirmation prompt
  --dry-run       Show what would be reset without making changes
  --backup-first  Create backup before resetting
  --help          Show this help message

Examples:
  npm run reset:db                    # Reset with confirmation
  npm run reset:db --confirm          # Skip confirmation
  npm run reset:db --dry-run         # Preview reset without changes
  npm run reset:db --backup-first    # Backup then reset

⚠️  WARNING: This will DELETE ALL DATA from the database!
        `);
        process.exit(0);
      default:
        console.error(`❌ Unknown option: ${args[i]}`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
  }
  
  try {
    await resetDatabase(options);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { resetDatabase };
