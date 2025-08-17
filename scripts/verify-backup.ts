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

interface VerifyOptions {
  backupPath?: string;
  compareWithDb?: boolean;
  detailed?: boolean;
}

async function verifyBackup(options: VerifyOptions = {}) {
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
    console.log(`📁 Verifying backup: ${backups[0]}`);
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
  
  // Verify backup files
  console.log('\n🔍 Verifying backup files...');
  const verificationResults: any[] = [];
  
  for (const table of summary.tables) {
    const jsonPath = path.join(backupPath, table.jsonFile);
    const sqlPath = path.join(backupPath, table.sqlFile);
    
    const jsonExists = fs.existsSync(jsonPath);
    const sqlExists = fs.existsSync(sqlPath);
    
    let jsonValid = false;
    let recordCount = 0;
    
    if (jsonExists) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        jsonValid = Array.isArray(jsonData);
        recordCount = jsonValid ? jsonData.length : 0;
      } catch (error) {
        jsonValid = false;
      }
    }
    
    const status = jsonExists && sqlExists && jsonValid ? '✅' : '❌';
    console.log(`   ${status} ${table.name}: ${recordCount} records`);
    
    verificationResults.push({
      name: table.name,
      jsonExists,
      sqlExists,
      jsonValid,
      recordCount,
      expectedCount: table.recordCount
    });
  }
  
  // Check for missing files
  const missingFiles = verificationResults.filter(r => !r.jsonExists || !r.sqlExists);
  if (missingFiles.length > 0) {
    console.log('\n⚠️  Missing backup files:');
    for (const missing of missingFiles) {
      if (!missing.jsonExists) console.log(`   ❌ ${missing.name}.json`);
      if (!missing.sqlExists) console.log(`   ❌ ${missing.name}.sql`);
    }
  }
  
  // Check for invalid JSON
  const invalidJson = verificationResults.filter(r => !r.jsonValid);
  if (invalidJson.length > 0) {
    console.log('\n⚠️  Invalid JSON files:');
    for (const invalid of invalidJson) {
      console.log(`   ❌ ${invalid.name}.json`);
    }
  }
  
  // Check record count consistency
  const countMismatch = verificationResults.filter(r => r.recordCount !== r.expectedCount);
  if (countMismatch.length > 0) {
    console.log('\n⚠️  Record count mismatches:');
    for (const mismatch of countMismatch) {
      console.log(`   ⚠️  ${mismatch.name}: ${mismatch.recordCount} vs ${mismatch.expectedCount} expected`);
    }
  }
  
  // Compare with current database if requested
  if (options.compareWithDb) {
    console.log('\n🔄 Comparing backup with current database...');
    
    for (const table of verificationResults) {
      if (!table.jsonValid) continue;
      
      try {
        const { count, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ⚠️  ${table.name}: Could not compare (${error.message})`);
        } else {
          const backupCount = table.recordCount;
          const dbCount = count || 0;
          const status = backupCount === dbCount ? '✅' : '❌';
          console.log(`   ${status} ${table.name}: Backup ${backupCount} vs DB ${dbCount}`);
          
          if (options.detailed && backupCount !== dbCount) {
            console.log(`      Difference: ${Math.abs(backupCount - dbCount)} records`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  ${table.name}: Comparison failed`);
      }
    }
  }
  
  // Overall verification status
  const allValid = verificationResults.every(r => r.jsonExists && r.sqlExists && r.jsonValid);
  const allCountsMatch = verificationResults.every(r => r.recordCount === r.expectedCount);
  
  console.log('\n📊 Verification Summary:');
  console.log(`   Files Complete: ${allValid ? '✅' : '❌'}`);
  console.log(`   Counts Match: ${allCountsMatch ? '✅' : '❌'}`);
  console.log(`   Total Tables: ${verificationResults.length}`);
  console.log(`   Valid Tables: ${verificationResults.filter(r => r.jsonExists && r.sqlExists && r.jsonValid).length}`);
  
  if (allValid && allCountsMatch) {
    console.log('\n🎉 Backup verification passed! All files are valid and complete.');
  } else {
    console.log('\n⚠️  Backup verification failed! Some issues were found.');
    console.log('   Review the warnings above and consider re-running the backup.');
  }
  
  return {
    summary,
    verificationResults,
    allValid,
    allCountsMatch
  };
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options: VerifyOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--backup-path':
        options.backupPath = args[++i];
        break;
      case '--compare-with-db':
        options.compareWithDb = true;
        break;
      case '--detailed':
        options.detailed = true;
        break;
      case '--help':
        console.log(`
Backup Verification Script

Usage: npm run verify:backup [options]

Options:
  --backup-path <path>  Specify backup directory path
  --compare-with-db     Compare backup with current database state
  --detailed            Show detailed comparison information
  --help                Show this help message

Examples:
  npm run verify:backup                    # Verify most recent backup
  npm run verify:backup --compare-with-db  # Compare with current DB
  npm run verify:backup --detailed         # Show detailed comparison
  npm run verify:backup --backup-path ./backups/2024-01-01T10-00-00-000Z
        `);
        process.exit(0);
      default:
        console.error(`❌ Unknown option: ${args[i]}`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
  }
  
  try {
    await verifyBackup(options);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { verifyBackup };
