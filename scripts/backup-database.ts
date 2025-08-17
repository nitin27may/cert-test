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

interface BackupTable {
  name: string;
  query: string;
  description: string;
}

const backupTables: BackupTable[] = [
  {
    name: 'exams',
    query: 'SELECT * FROM exams',
    description: 'Exam metadata and configurations'
  },
  {
    name: 'topics',
    query: 'SELECT * FROM topics',
    description: 'Exam topics and domains'
  },
  {
    name: 'topic_modules',
    query: 'SELECT * FROM topic_modules',
    description: 'Modules within topics'
  },
  {
    name: 'questions',
    query: 'SELECT * FROM questions',
    description: 'Question bank'
  },
  {
    name: 'certification_info',
    query: 'SELECT * FROM certification_info',
    description: 'Certification details'
  },
  {
    name: 'user_exam_sessions',
    query: 'SELECT * FROM user_exam_sessions',
    description: 'User exam sessions'
  },
  {
    name: 'session_questions',
    query: 'SELECT * FROM session_questions',
    description: 'Session question assignments'
  },
  {
    name: 'user_answers',
    query: 'SELECT * FROM user_answers',
    description: 'User answer submissions'
  },
  {
    name: 'exam_results',
    query: 'SELECT * FROM exam_results',
    description: 'Exam results and analytics'
  },
  {
    name: 'user_preferences',
    query: 'SELECT * FROM user_preferences',
    description: 'User preferences and settings'
  }
];

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', timestamp);
  
  // Create backup directory
  if (!fs.existsSync(path.join(process.cwd(), 'backups'))) {
    fs.mkdirSync(path.join(process.cwd(), 'backups'));
  }
  fs.mkdirSync(backupDir);
  
  console.log(`🔄 Creating database backup in: ${backupDir}`);
  
  const backupSummary: any = {
    timestamp: new Date().toISOString(),
    tables: [],
    totalRecords: 0,
    backupPath: backupDir
  };
  
  for (const table of backupTables) {
    try {
      console.log(`📊 Backing up ${table.name}...`);
      
      const { data, error } = await supabase
        .from(table.name)
        .select('*');
      
      if (error) {
        console.error(`❌ Error backing up ${table.name}:`, error.message);
        continue;
      }
      
      const recordCount = data?.length || 0;
      backupSummary.totalRecords += recordCount;
      
      // Save table data to JSON file
      const tableBackupPath = path.join(backupDir, `${table.name}.json`);
      fs.writeFileSync(tableBackupPath, JSON.stringify(data, null, 2));
      
      // Create SQL backup
      const sqlBackupPath = path.join(backupDir, `${table.name}.sql`);
      const sqlContent = generateSQLBackup(table.name, data || []);
      fs.writeFileSync(sqlBackupPath, sqlContent);
      
      backupSummary.tables.push({
        name: table.name,
        recordCount,
        description: table.description,
        jsonFile: `${table.name}.json`,
        sqlFile: `${table.name}.sql`
      });
      
      console.log(`✅ ${table.name}: ${recordCount} records backed up`);
      
    } catch (error) {
      console.error(`❌ Failed to backup ${table.name}:`, error);
    }
  }
  
  // Save backup summary
  const summaryPath = path.join(backupDir, 'backup-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(backupSummary, null, 2));
  
  // Create restore script
  const restoreScriptPath = path.join(backupDir, 'restore-backup.sql');
  const restoreScript = generateRestoreScript(backupSummary.tables);
  fs.writeFileSync(restoreScriptPath, restoreScript);
  
  console.log('\n🎉 Database backup completed successfully!');
  console.log(`📁 Backup location: ${backupDir}`);
  console.log(`📊 Total records backed up: ${backupSummary.totalRecords}`);
  console.log(`📋 Summary: ${summaryPath}`);
  console.log(`🔄 Restore script: ${restoreScriptPath}`);
  
  return backupSummary;
}

function generateSQLBackup(tableName: string, data: any[]): string {
  if (data.length === 0) {
    return `-- Table: ${tableName}\n-- No data to backup\n`;
  }
  
  const columns = Object.keys(data[0]);
  let sql = `-- Table: ${tableName}\n`;
  sql += `-- Backup created: ${new Date().toISOString()}\n`;
  sql += `-- Records: ${data.length}\n\n`;
  
  // Create table structure (basic)
  sql += `-- Note: This is a data backup, not a schema backup\n`;
  sql += `-- Run the schema creation script first if needed\n\n`;
  
  // Insert statements
  for (const record of data) {
    const values = columns.map(col => {
      const value = record[col];
      if (value === null) return 'NULL';
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      return value;
    });
    
    sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
  }
  
  return sql;
}

function generateRestoreScript(tables: any[]): string {
  let script = `-- Database Restore Script\n`;
  script += `-- Generated: ${new Date().toISOString()}\n`;
  script += `-- WARNING: This will overwrite existing data!\n\n`;
  
  script += `-- Step 1: Disable RLS temporarily for restore\n`;
  script += `-- ALTER TABLE exams DISABLE ROW LEVEL SECURITY;\n`;
  script += `-- ALTER TABLE topics DISABLE ROW LEVEL SECURITY;\n`;
  script += `-- ALTER TABLE questions DISABLE ROW LEVEL SECURITY;\n`;
  script += `-- ALTER TABLE certification_info DISABLE ROW LEVEL SECURITY;\n\n`;
  
  script += `-- Step 2: Clear existing data\n`;
  for (const table of tables) {
    script += `TRUNCATE TABLE ${table.name} CASCADE;\n`;
  }
  script += `\n`;
  
  script += `-- Step 3: Restore data from backup files\n`;
  script += `-- Run the individual table SQL files in this order:\n`;
  for (const table of tables) {
    script += `-- \\i ${table.sqlFile}  -- ${table.description}\n`;
  }
  script += `\n`;
  
  script += `-- Step 4: Re-enable RLS\n`;
  script += `-- ALTER TABLE exams ENABLE ROW LEVEL SECURITY;\n`;
  script += `-- ALTER TABLE topics ENABLE ROW LEVEL SECURITY;\n`;
  script += `-- ALTER TABLE questions ENABLE ROW LEVEL SECURITY;\n`;
  script += `-- ALTER TABLE certification_info ENABLE ROW LEVEL SECURITY;\n\n`;
  
  script += `-- Step 5: Verify restore\n`;
  for (const table of tables) {
    script += `SELECT '${table.name}' as table_name, COUNT(*) as record_count FROM ${table.name};\n`;
  }
  
  return script;
}

// Run backup if called directly
if (require.main === module) {
  createBackup()
    .then(() => {
      console.log('\n✅ Backup process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Backup failed:', error);
      process.exit(1);
    });
}

export { createBackup };
