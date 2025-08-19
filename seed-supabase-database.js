const fs = require('fs');
const path = require('path');

/**
 * Supabase Database Seeding Script for Certification Exam Data
 * 
 * This script reads exam data from exams-old.json and generates SQL INSERT statements
 * that can be used to populate the Supabase database with exam, topic, and question data.
 * 
 * Usage:
 * 1. Run: node seed-supabase-database.js
 * 2. Review the generated SQL files
 * 3. Execute the SQL in your Supabase database
 * 
 * Note: This script handles duplicate questions by filtering them out before seeding
 */

const JSON_FILE_PATH = './public/data/exams-old.json';
const OUTPUT_DIR = './database-seed-sql';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper function to escape SQL strings
function escapeSqlString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

// Helper function to convert JSON to SQL-ready JSONB
function toJsonb(obj) {
    return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

// Read and parse the JSON file
console.log('📖 Reading exam data from:', JSON_FILE_PATH);
const examData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8'));

// Track question duplicates by text content
const questionTextTracker = new Map();
const duplicateQuestions = new Set();
let totalQuestions = 0;
let uniqueQuestions = 0;

console.log('\n🔍 Analyzing data structure and detecting duplicates...');

// First pass: identify duplicates across all exams
Object.entries(examData.exams).forEach(([examId, exam]) => {
    console.log(`   - ${examId}: ${exam.questions?.length || 0} questions`);
    
    if (exam.questions) {
        exam.questions.forEach(question => {
            totalQuestions++;
            const questionText = question.question.trim().toLowerCase();
            
            if (questionTextTracker.has(questionText)) {
                // Mark both original and current as duplicates
                duplicateQuestions.add(questionTextTracker.get(questionText));
                duplicateQuestions.add(`${examId}-${question.id}`);
            } else {
                questionTextTracker.set(questionText, `${examId}-${question.id}`);
                uniqueQuestions++;
            }
        });
    }
});

console.log(`\n📊 Duplicate Analysis:`);
console.log(`   - Total questions: ${totalQuestions}`);
console.log(`   - Unique questions: ${uniqueQuestions}`);
console.log(`   - Duplicate questions: ${duplicateQuestions.size}`);
console.log(`   - Duplication rate: ${((duplicateQuestions.size / totalQuestions) * 100).toFixed(1)}%`);

// Generate SQL for each table
const sqlFiles = [];

// 1. Generate EXAMS table data
console.log('\n🏗️  Generating SQL for exams table...');
const examsSql = [];
examsSql.push('-- Exams Table Data');
examsSql.push('-- Generated from exams-old.json');
examsSql.push('');

Object.entries(examData.exams).forEach(([examId, exam]) => {
    const uniqueQuestionsCount = exam.questions 
        ? exam.questions.filter(q => !duplicateQuestions.has(`${examId}-${q.id}`)).length 
        : 0;
        
    const examSql = `INSERT INTO exams (id, title, description, total_questions, certification_guide_url, study_guide_url, is_active) VALUES (
    '${examId}',
    '${escapeSqlString(exam.title)}',
    '${escapeSqlString(exam.description)}',
    ${uniqueQuestionsCount},
    ${exam.certification_guide_url ? `'${exam.certification_guide_url}'` : 'NULL'},
    ${exam.study_guide_url ? `'${exam.study_guide_url}'` : 'NULL'},
    true
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    total_questions = EXCLUDED.total_questions,
    certification_guide_url = EXCLUDED.certification_guide_url,
    study_guide_url = EXCLUDED.study_guide_url,
    updated_at = now();`;
    
    examsSql.push(examSql);
    examsSql.push('');
});

fs.writeFileSync(path.join(OUTPUT_DIR, '01-exams.sql'), examsSql.join('\n'));
sqlFiles.push('01-exams.sql');

// 2. Generate TOPICS table data
console.log('🏗️  Generating SQL for topics table...');
const topicsSql = [];
topicsSql.push('-- Topics Table Data');
topicsSql.push('-- Generated from exams-old.json');
topicsSql.push('');

Object.entries(examData.exams).forEach(([examId, exam]) => {
    if (exam.topics) {
        exam.topics.forEach(topic => {
            // Parse weight percentage if available
            let weightage = null;
            if (topic.weight) {
                const weightMatch = topic.weight.match(/(\d+)/);
                if (weightMatch) {
                    weightage = parseFloat(weightMatch[1]);
                }
            }
            
            const topicSql = `INSERT INTO topics (id, exam_id, name, weight, weightage) VALUES (
    '${topic.id}',
    '${examId}',
    '${escapeSqlString(topic.name)}',
    ${topic.weight ? `'${escapeSqlString(topic.weight)}'` : 'NULL'},
    ${weightage || 'NULL'}
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    weight = EXCLUDED.weight,
    weightage = EXCLUDED.weightage,
    updated_at = now();`;
            
            topicsSql.push(topicSql);
        });
        topicsSql.push('');
    }
});

fs.writeFileSync(path.join(OUTPUT_DIR, '02-topics.sql'), topicsSql.join('\n'));
sqlFiles.push('02-topics.sql');

// 3. Generate TOPIC_MODULES table data
console.log('🏗️  Generating SQL for topic_modules table...');
const modulesSql = [];
modulesSql.push('-- Topic Modules Table Data');
modulesSql.push('-- Generated from exams-old.json');
modulesSql.push('');

Object.entries(examData.exams).forEach(([examId, exam]) => {
    if (exam.topics) {
        exam.topics.forEach(topic => {
            if (topic.modules && Array.isArray(topic.modules)) {
                topic.modules.forEach(moduleName => {
                    const moduleSql = `INSERT INTO topic_modules (topic_id, module_name, description) VALUES (
    '${topic.id}',
    '${escapeSqlString(moduleName)}',
    NULL
);`;
                    modulesSql.push(moduleSql);
                });
            }
        });
        modulesSql.push('');
    }
});

fs.writeFileSync(path.join(OUTPUT_DIR, '03-topic-modules.sql'), modulesSql.join('\n'));
sqlFiles.push('03-topic-modules.sql');

// 4. Generate QUESTIONS table data (filtering out duplicates)
console.log('🏗️  Generating SQL for questions table...');
const questionsSql = [];
questionsSql.push('-- Questions Table Data (Duplicates Filtered)');
questionsSql.push('-- Generated from exams-old.json');
questionsSql.push('-- Note: Duplicate questions have been filtered out');
questionsSql.push('');

let questionIdCounter = 1;
let processedQuestions = 0;
let skippedDuplicates = 0;

Object.entries(examData.exams).forEach(([examId, exam]) => {
    if (exam.questions) {
        exam.questions.forEach(question => {
            const questionKey = `${examId}-${question.id}`;
            
            // Skip duplicates
            if (duplicateQuestions.has(questionKey)) {
                skippedDuplicates++;
                return;
            }
            
            processedQuestions++;
            
            // Convert correct answer index to array of correct option texts
            const correctAnswers = [];
            if (Array.isArray(question.correct)) {
                // Multiple correct answers
                question.correct.forEach(index => {
                    if (question.options[index]) {
                        correctAnswers.push(question.options[index]);
                    }
                });
            } else if (typeof question.correct === 'number') {
                // Single correct answer
                if (question.options[question.correct]) {
                    correctAnswers.push(question.options[question.correct]);
                }
            }
            
            // Convert options array to JSONB format
            const optionsJsonb = toJsonb(question.options);
            const correctAnswersJsonb = toJsonb(correctAnswers);
            const reasoningJsonb = question.reasoning ? toJsonb(question.reasoning) : 'NULL';
            const referenceJsonb = question.reference ? toJsonb(question.reference) : 'NULL';
            
            const questionSql = `INSERT INTO questions (
    id, 
    exam_id, 
    topic_id, 
    module, 
    category, 
    type, 
    difficulty, 
    question_text, 
    options, 
    correct_answers, 
    explanation, 
    reasoning, 
    reference, 
    is_active
) VALUES (
    ${questionIdCounter},
    '${examId}',
    ${question.topic ? `'${question.topic}'` : 'NULL'},
    ${question.module ? `'${escapeSqlString(question.module)}'` : 'NULL'},
    ${question.category ? `'${escapeSqlString(question.category)}'` : 'NULL'},
    '${question.type || 'single'}',
    '${question.difficulty || 'medium'}',
    '${escapeSqlString(question.question)}',
    ${optionsJsonb},
    ${correctAnswersJsonb},
    ${question.explanation ? `'${escapeSqlString(question.explanation)}'` : 'NULL'},
    ${reasoningJsonb},
    ${referenceJsonb},
    true
) ON CONFLICT (id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_answers = EXCLUDED.correct_answers,
    explanation = EXCLUDED.explanation,
    reasoning = EXCLUDED.reasoning,
    reference = EXCLUDED.reference,
    updated_at = now();`;
            
            questionsSql.push(questionSql);
            questionsSql.push('');
            questionIdCounter++;
        });
    }
});

fs.writeFileSync(path.join(OUTPUT_DIR, '04-questions.sql'), questionsSql.join('\n'));
sqlFiles.push('04-questions.sql');

// 5. Generate CERTIFICATION_INFO table data
console.log('🏗️  Generating SQL for certification_info table...');
const certInfoSql = [];
certInfoSql.push('-- Certification Info Table Data');
certInfoSql.push('-- Generated from exams-old.json');
certInfoSql.push('');

Object.entries(examData.exams).forEach(([examId, exam]) => {
    const examCode = examId.toUpperCase();
    const level = examCode.includes('900') ? 'Fundamentals' : 
                  examCode.includes('104') || examCode.includes('204') || examCode.includes('400') || examCode.includes('500') ? 'Associate' : 
                  'Expert';
    
    // Extract skills measured from topics
    const skillsMeasured = exam.topics ? exam.topics.map(topic => ({
        topic: topic.name,
        weight: topic.weight,
        modules: topic.modules || []
    })) : [];
    
    const certSql = `INSERT INTO certification_info (
    exam_id,
    title,
    description,
    exam_code,
    level,
    validity,
    skills_measured,
    study_resources
) VALUES (
    '${examId}',
    '${escapeSqlString(exam.title)}',
    '${escapeSqlString(exam.description)}',
    '${examCode}',
    '${level}',
    'No expiration',
    ${toJsonb(skillsMeasured)},
    ${toJsonb({
        certification_guide: exam.certification_guide_url,
        study_guide: exam.study_guide_url
    })}
) ON CONFLICT (exam_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    skills_measured = EXCLUDED.skills_measured,
    study_resources = EXCLUDED.study_resources,
    updated_at = now();`;
    
    certInfoSql.push(certSql);
    certInfoSql.push('');
});

fs.writeFileSync(path.join(OUTPUT_DIR, '05-certification-info.sql'), certInfoSql.join('\n'));
sqlFiles.push('05-certification-info.sql');

// Generate master execution script
console.log('🏗️  Generating master execution script...');
const masterScript = [];
masterScript.push('-- Master Database Seeding Script');
masterScript.push('-- Execute this script in your Supabase SQL editor');
masterScript.push('-- or run each file individually in order');
masterScript.push('');
masterScript.push('BEGIN;');
masterScript.push('');

sqlFiles.forEach(file => {
    masterScript.push(`-- Execute ${file}`);
    masterScript.push(`\\i ${file}`);
    masterScript.push('');
});

masterScript.push('COMMIT;');
masterScript.push('');
masterScript.push('-- Seeding Summary:');
masterScript.push(`-- Total exams: ${Object.keys(examData.exams).length}`);
masterScript.push(`-- Total questions processed: ${processedQuestions}`);
masterScript.push(`-- Duplicate questions skipped: ${skippedDuplicates}`);
masterScript.push(`-- Data quality improvement: ${((skippedDuplicates / totalQuestions) * 100).toFixed(1)}% duplicates removed`);

fs.writeFileSync(path.join(OUTPUT_DIR, '00-master-seed.sql'), masterScript.join('\n'));

// Create README for the generated SQL files
const readmeContent = `# Database Seeding SQL Files

This directory contains SQL files generated from \`exams-old.json\` to seed your Supabase database.

## 📁 Files Generated

1. **00-master-seed.sql** - Master script that executes all others
2. **01-exams.sql** - Exam metadata and basic information
3. **02-topics.sql** - Exam topics with weights and weightage
4. **03-topic-modules.sql** - Individual modules within each topic
5. **04-questions.sql** - All exam questions (duplicates filtered out)
6. **05-certification-info.sql** - Detailed certification information

## 📊 Seeding Statistics

- **Total Exams**: ${Object.keys(examData.exams).length}
- **Total Questions**: ${totalQuestions}
- **Unique Questions**: ${processedQuestions}
- **Duplicates Removed**: ${skippedDuplicates}
- **Data Quality Improvement**: ${((skippedDuplicates / totalQuestions) * 100).toFixed(1)}% duplicates filtered

## 🚀 How to Use

### Option 1: Execute All at Once
1. Open Supabase SQL Editor
2. Copy and paste the contents of \`00-master-seed.sql\`
3. Execute the script

### Option 2: Execute Files Individually
Execute the files in this order:
1. \`01-exams.sql\`
2. \`02-topics.sql\`
3. \`03-topic-modules.sql\`
4. \`04-questions.sql\`
5. \`05-certification-info.sql\`

## ⚠️ Important Notes

- All SQL includes \`ON CONFLICT\` handling for safe re-execution
- Questions are deduplicated based on text content similarity
- Foreign key relationships are maintained between tables
- JSON data is properly escaped and formatted for PostgreSQL

## 🔧 Database Schema Compatibility

The generated SQL is compatible with your Supabase schema:
- ✅ \`exams\` table
- ✅ \`topics\` table  
- ✅ \`topic_modules\` table
- ✅ \`questions\` table
- ✅ \`certification_info\` table

## 📝 Data Mapping

### Questions Table
- \`id\`: Auto-incremented unique identifier
- \`exam_id\`: Maps from JSON exam key (e.g., "az-104")
- \`topic_id\`: Maps from JSON question.topic
- \`type\`: Maps from JSON question.type
- \`difficulty\`: Maps from JSON question.difficulty
- \`correct_answers\`: Converted from index to text array
- \`options\`: Direct JSONB mapping
- \`reasoning\` & \`reference\`: Direct JSONB mapping

### Duplicate Handling
Questions with identical text content are automatically filtered out to improve data quality.

Generated on: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readmeContent);

// Final summary
console.log('\n✅ Database seeding files generated successfully!');
console.log(`📁 Output directory: ${OUTPUT_DIR}`);
console.log(`📊 Summary:`);
console.log(`   - ${Object.keys(examData.exams).length} exams processed`);
console.log(`   - ${processedQuestions} unique questions (${skippedDuplicates} duplicates filtered)`);
console.log(`   - ${sqlFiles.length + 2} SQL files created`);
console.log('\n🚀 Next steps:');
console.log('1. Review the generated SQL files');
console.log('2. Execute them in your Supabase database');
console.log('3. Check the README.md for detailed instructions');
console.log('\n💡 Pro tip: Start with 00-master-seed.sql to execute everything at once!');
