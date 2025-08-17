/**
 * Migration script to transfer exam data from JSON to Supabase database
 * 
 * This script reads the existing exams.json file and migrates all data
 * to the new relational database structure in Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Types for the JSON structure
interface JsonExamTopic {
  id: string;
  name: string;
  weight?: string;
  modules: string[];
}

interface JsonQuestion {
  id: number;
  topic: string;
  module: string;
  category: string;
  type: 'single' | 'multiple';
  difficulty: 'easy' | 'medium' | 'difficult';
  question: string;
  options: string[];
  correct: number | number[];
  explanation: string;
  reasoning: {
    correct: string;
    why_others_wrong: Record<string, string>;
  };
  reference: {
    title: string;
    url: string;
  };
}

interface JsonCertificationInfo {
  title: string;
  description: string;
  examCode: string;
  level: string;
  validity: string;
  prerequisites: string[];
  skillsMeasured: Array<{
    category: string;
    weightage: number;
    skills: string[];
  }>;
  studyResources: Array<{
    title: string;
    type: string;
    url: string;
    description: string;
  }>;
  examDetails: {
    duration: string;
    questions: string;
    passingScore: string;
    cost: string;
    languages: string[];
  };
  careerPath: string[];
}

interface JsonExam {
  id: string;
  title: string;
  description: string;
  certification_guide_url?: string;
  study_guide_url?: string;
  totalQuestions: number;
  networkingFocusPercentage?: number;
  topics: JsonExamTopic[];
  questions: JsonQuestion[];
  certificationInfo?: JsonCertificationInfo;
}

interface JsonExamData {
  exams: Record<string, JsonExam>;
}

class ExamDataMigrator {
  private supabase: any;
  private jsonData: JsonExamData;

  constructor(supabaseUrl: string, supabaseKey: string, jsonFilePath: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Load JSON data
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    this.jsonData = JSON.parse(jsonContent);
  }

  async migrate(): Promise<void> {
    console.log('🚀 Starting exam data migration...');
    
    try {
      // Clean existing data (optional - remove in production)
      await this.cleanExistingData();
      
      // Migrate data in order of dependencies
      await this.migrateExams();
      await this.migrateTopics();
      await this.migrateTopicModules();
      await this.migrateQuestions();
      await this.migrateCertificationInfo();
      
      console.log('✅ Migration completed successfully!');
      await this.printMigrationSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async cleanExistingData(): Promise<void> {
    console.log('🧹 Cleaning existing data...');
    
    // Delete in reverse order of dependencies
    await this.supabase.from('certification_info').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.supabase.from('questions').delete().neq('id', 0);
    await this.supabase.from('topic_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.supabase.from('topics').delete().neq('id', '');
    await this.supabase.from('exams').delete().neq('id', '');
    
    console.log('✅ Existing data cleaned');
  }

  private async migrateExams(): Promise<void> {
    console.log('📚 Migrating exams...');
    
    const exams = Object.values(this.jsonData.exams).map(exam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      total_questions: exam.totalQuestions,
      networking_focus_percentage: exam.networkingFocusPercentage || null,
      certification_guide_url: exam.certification_guide_url || null,
      study_guide_url: exam.study_guide_url || null,
      is_active: true
    }));

    const { error } = await this.supabase
      .from('exams')
      .insert(exams);

    if (error) {
      throw new Error(`Failed to migrate exams: ${error.message}`);
    }

    console.log(`✅ Migrated ${exams.length} exams`);
  }

  private async migrateTopics(): Promise<void> {
    console.log('🎯 Migrating topics...');
    
    const topics = [];
    
    for (const exam of Object.values(this.jsonData.exams)) {
      for (const topic of exam.topics) {
        // Extract numerical weight if possible
        let weightage = null;
        if (topic.weight) {
          const match = topic.weight.match(/(\d+)-?(\d+)?%?/);
          if (match) {
            const min = parseInt(match[1]);
            const max = match[2] ? parseInt(match[2]) : min;
            weightage = (min + max) / 2; // Average of range
          }
        }

        topics.push({
          id: `${exam.id}-${topic.id}`,
          exam_id: exam.id,
          name: topic.name,
          weight: topic.weight || null,
          weightage: weightage
        });
      }
    }

    const { error } = await this.supabase
      .from('topics')
      .insert(topics);

    if (error) {
      throw new Error(`Failed to migrate topics: ${error.message}`);
    }

    console.log(`✅ Migrated ${topics.length} topics`);
  }

  private async migrateTopicModules(): Promise<void> {
    console.log('📝 Migrating topic modules...');
    
    const modules = [];
    
    for (const exam of Object.values(this.jsonData.exams)) {
      for (const topic of exam.topics) {
        const topicId = `${exam.id}-${topic.id}`;
        
        for (const module of topic.modules) {
          modules.push({
            topic_id: topicId,
            module_name: module,
            description: null
          });
        }
      }
    }

    if (modules.length > 0) {
      const { error } = await this.supabase
        .from('topic_modules')
        .insert(modules);

      if (error) {
        throw new Error(`Failed to migrate topic modules: ${error.message}`);
      }
    }

    console.log(`✅ Migrated ${modules.length} topic modules`);
  }

  private async migrateQuestions(): Promise<void> {
    console.log('❓ Migrating questions...');
    
    const batchSize = 1000; // Process questions in batches
    let totalMigrated = 0;
    
    for (const exam of Object.values(this.jsonData.exams)) {
      console.log(`  Processing ${exam.questions.length} questions for exam: ${exam.title}`);
      
      const questions = exam.questions.map(question => {
        // Find matching topic ID
        const matchingTopic = exam.topics.find(topic => 
          topic.id === question.topic || 
          topic.name.toLowerCase().includes(question.topic.toLowerCase()) ||
          question.topic.toLowerCase().includes(topic.name.toLowerCase())
        );
        
        const topicId = matchingTopic ? `${exam.id}-${matchingTopic.id}` : null;
        
        // Ensure correct_answers is always an array
        let correctAnswers: number[];
        if (Array.isArray(question.correct)) {
          correctAnswers = question.correct;
        } else {
          correctAnswers = [question.correct];
        }

        return {
          id: question.id,
          exam_id: exam.id,
          topic_id: topicId,
          module: question.module,
          category: question.category,
          type: question.type,
          difficulty: question.difficulty,
          question_text: question.question,
          options: JSON.stringify(question.options),
          correct_answers: JSON.stringify(correctAnswers),
          explanation: question.explanation,
          reasoning: JSON.stringify(question.reasoning),
          reference: JSON.stringify(question.reference),
          is_active: true
        };
      });

      // Process in batches
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        
        const { error } = await this.supabase
          .from('questions')
          .insert(batch);

        if (error) {
          throw new Error(`Failed to migrate questions batch: ${error.message}`);
        }
        
        totalMigrated += batch.length;
        console.log(`  ✅ Migrated ${totalMigrated}/${questions.length} questions for ${exam.id}`);
      }
    }

    console.log(`✅ Migrated ${totalMigrated} questions total`);
  }

  private async migrateCertificationInfo(): Promise<void> {
    console.log('🎓 Migrating certification info...');
    
    const certifications = [];
    
    for (const exam of Object.values(this.jsonData.exams)) {
      if (exam.certificationInfo) {
        certifications.push({
          exam_id: exam.id,
          title: exam.certificationInfo.title,
          description: exam.certificationInfo.description,
          exam_code: exam.certificationInfo.examCode,
          level: exam.certificationInfo.level,
          validity: exam.certificationInfo.validity,
          prerequisites: JSON.stringify(exam.certificationInfo.prerequisites),
          skills_measured: JSON.stringify(exam.certificationInfo.skillsMeasured),
          study_resources: JSON.stringify(exam.certificationInfo.studyResources),
          exam_details: JSON.stringify(exam.certificationInfo.examDetails),
          career_path: JSON.stringify(exam.certificationInfo.careerPath)
        });
      }
    }

    if (certifications.length > 0) {
      const { error } = await this.supabase
        .from('certification_info')
        .insert(certifications);

      if (error) {
        throw new Error(`Failed to migrate certification info: ${error.message}`);
      }
    }

    console.log(`✅ Migrated ${certifications.length} certification records`);
  }

  private async printMigrationSummary(): Promise<void> {
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(50));
    
    const counts = await Promise.all([
      this.supabase.from('exams').select('*', { count: 'exact', head: true }),
      this.supabase.from('topics').select('*', { count: 'exact', head: true }),
      this.supabase.from('topic_modules').select('*', { count: 'exact', head: true }),
      this.supabase.from('questions').select('*', { count: 'exact', head: true }),
      this.supabase.from('certification_info').select('*', { count: 'exact', head: true })
    ]);

    console.log(`📚 Exams: ${counts[0].count}`);
    console.log(`🎯 Topics: ${counts[1].count}`);
    console.log(`📝 Topic Modules: ${counts[2].count}`);
    console.log(`❓ Questions: ${counts[3].count}`);
    console.log(`🎓 Certification Info: ${counts[4].count}`);
    console.log('='.repeat(50));
  }
}

// Main execution function
async function main() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  // Path to the JSON file
  const jsonFilePath = path.join(process.cwd(), 'public', 'data', 'exams.json');
  
  if (!fs.existsSync(jsonFilePath)) {
    throw new Error(`JSON file not found at: ${jsonFilePath}`);
  }

  // Create migrator and run migration
  const migrator = new ExamDataMigrator(supabaseUrl, supabaseKey, jsonFilePath);
  await migrator.migrate();
}

// Run migration if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { ExamDataMigrator, main as runMigration };