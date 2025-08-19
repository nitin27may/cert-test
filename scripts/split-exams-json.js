const fs = require('fs');
const path = require('path');

/**
 * Split Exams JSON File Script
 * 
 * This script reads the large exams-old.json file and splits it into
 * individual JSON files for each exam, maintaining the same structure.
 * 
 * Usage: node split-exams-json.js
 */

const INPUT_FILE = './public/data/exams-old.json';
const OUTPUT_DIR = './public/data';

console.log('📖 Reading exams data from:', INPUT_FILE);

// Read and parse the JSON file
let examData;
try {
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    examData = JSON.parse(fileContent);
    console.log('✅ Successfully parsed JSON file');
} catch (error) {
    console.error('❌ Error reading or parsing JSON file:', error.message);
    process.exit(1);
}

// Check if the exams object exists
if (!examData.exams || typeof examData.exams !== 'object') {
    console.error('❌ Invalid JSON structure: "exams" object not found');
    process.exit(1);
}

console.log(`\n🔍 Found ${Object.keys(examData.exams).length} exams to split:`);

// Split each exam into its own file
Object.entries(examData.exams).forEach(([examId, examContent]) => {
    console.log(`   - Processing ${examId}...`);
    
    // Create the individual exam JSON structure with same root structure
    const individualExamData = {
        exams: {
            [examId]: examContent
        }
    };
    
    // Create filename
    const filename = `${examId}-exam.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    try {
        // Write the individual exam file with proper formatting
        fs.writeFileSync(filepath, JSON.stringify(individualExamData, null, 2), 'utf8');
        
        // Get file size for reporting
        const stats = fs.statSync(filepath);
        const fileSizeKB = (stats.size / 1024).toFixed(1);
        
        console.log(`     ✅ Created ${filename} (${fileSizeKB} KB)`);
        console.log(`     📊 Questions: ${examContent.questions?.length || 0}`);
        console.log(`     📚 Topics: ${examContent.topics?.length || 0}`);
        
    } catch (error) {
        console.error(`     ❌ Error writing ${filename}:`, error.message);
    }
});

// Generate summary file
const summaryData = {
    generated_on: new Date().toISOString(),
    source_file: 'exams-old.json',
    total_exams: Object.keys(examData.exams).length,
    individual_files: Object.keys(examData.exams).map(examId => ({
        exam_id: examId,
        filename: `${examId}-exam.json`,
        title: examData.exams[examId].title || 'No title',
        total_questions: examData.exams[examId].questions?.length || 0,
        total_topics: examData.exams[examId].topics?.length || 0
    })),
    notes: [
        "Each file maintains the same root structure as the original",
        "Files are named using the pattern: {exam-id}-exam.json",
        "All original data including metadata and certification info is preserved"
    ]
};

const summaryPath = path.join(OUTPUT_DIR, 'exam-files-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2), 'utf8');

console.log(`\n✅ Successfully split exams into individual files!`);
console.log(`📁 Output directory: ${OUTPUT_DIR}`);
console.log(`📋 Summary file created: exam-files-summary.json`);
console.log(`\n📊 Summary:`);
console.log(`   - Total exams processed: ${Object.keys(examData.exams).length}`);
console.log(`   - Individual files created: ${Object.keys(examData.exams).length}`);
console.log(`   - All files maintain original JSON structure`);

// List all created files
console.log(`\n📄 Created files:`);
Object.keys(examData.exams).forEach(examId => {
    console.log(`   - ${examId}-exam.json`);
});
console.log(`   - exam-files-summary.json`);

console.log('\n💡 Each file contains:');
console.log('   - Same root "exams" object structure');
console.log('   - Complete exam data (topics, questions, metadata)');
console.log('   - Certification information');
console.log('   - Ready to use as drop-in replacement for specific exams');
