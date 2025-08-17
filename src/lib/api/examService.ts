import { Exam, Question } from '../types';

export interface ExamResponse {
  exams: Record<string, Exam>;
}

class ExamService {
  private cache: Map<string, Exam> = new Map();
  private allExamsCache: ExamResponse | null = null;

  async getAllExams(): Promise<ExamResponse> {
    if (this.allExamsCache) {
      return this.allExamsCache;
    }

    try {
      const response = await fetch('/data/exams.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ExamResponse = await response.json();
      this.allExamsCache = data;
      
      // Cache individual exams
      Object.values(data.exams).forEach(exam => {
        this.cache.set(exam.id, exam);
      });
      
      return data;
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      throw new Error('Failed to load exam data. Please try again later.');
    }
  }

  async getExamById(examId: string): Promise<Exam | null> {
    // Check cache first
    if (this.cache.has(examId)) {
      return this.cache.get(examId)!;
    }

    try {
      const allExams = await this.getAllExams();
      return allExams.exams[examId] || null;
    } catch (error) {
      console.error(`Failed to fetch exam ${examId}:`, error);
      return null;
    }
  }

  async getExamQuestions(examId: string, count?: number, selectedTopics?: string[]): Promise<Question[]> {
    const exam = await this.getExamById(examId);
    if (!exam) {
      throw new Error(`Exam ${examId} not found`);
    }

    let questions = exam.questions;
    console.log(`Total questions in exam: ${questions.length}`);
    
    // Apply topic filtering if provided
    if (selectedTopics && selectedTopics.length > 0) {
      console.log('Selected topics for filtering:', selectedTopics);
      console.log('Available question topics:', [...new Set(questions.map(q => q.topic))]);
      
      // Create a mapping from topic ID to topic name for filtering
      const topicIdToNameMap = new Map<string, string>();
      exam.topics.forEach(topic => {
        topicIdToNameMap.set(topic.id, topic.name);
      });
      
      console.log('Topic ID to Name mapping:', Object.fromEntries(topicIdToNameMap));
      
      const beforeFilter = questions.length;
      
      // Filter questions by matching topic ID to question topic
      questions = questions.filter(q => {
        // Check if any selected topic ID maps to this question's topic
        const matches = selectedTopics.some(topicId => {
          const topicName = topicIdToNameMap.get(topicId);
          
          // Try multiple matching strategies
          if (topicName) {
            // Strategy 1: Check if question topic contains the topic name
            if (q.topic.toLowerCase().includes(topicName.toLowerCase())) {
              return true;
            }
            
            // Strategy 2: Check if topic name contains the question topic
            if (topicName.toLowerCase().includes(q.topic.toLowerCase())) {
              return true;
            }
            
            // Strategy 3: Check for common keywords
            const commonKeywords = ['networking', 'storage', 'identity', 'security', 'monitoring', 'governance'];
            if (commonKeywords.some(keyword => 
              q.topic.toLowerCase().includes(keyword) && topicName.toLowerCase().includes(keyword)
            )) {
              return true;
            }
          }
          
          // Strategy 4: Direct topic ID to topic property match (fallback)
          if (q.topic === topicId) {
            return true;
          }
          
          return false;
        });
        
        if (matches) {
          console.log(`Question ${q.id} matches - Topic: ${q.topic}`);
        }
        
        return matches;
      });
      
      const afterFilter = questions.length;
      
      console.log(`Topic filtering: ${beforeFilter} -> ${afterFilter} questions`);
      console.log('Questions after topic filtering:', questions.map(q => ({ id: q.id, topic: q.topic })));
    } else {
      console.log('No topic filtering applied');
    }
    
    // Shuffle questions for variety
    questions = this.shuffleArray([...questions]);
    
    // Return specified count or all questions
    const finalQuestions = count ? questions.slice(0, count) : questions;
    console.log(`Returning ${finalQuestions.length} questions (requested: ${count || 'all'})`);
    
    return finalQuestions;
  }

  async getAvailableExams(): Promise<Array<{ id: string; title: string; description: string; totalQuestions: number; networkingFocusPercentage?: number }>> {
    try {
      const allExams = await this.getAllExams();
      return Object.values(allExams.exams).map(exam => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        totalQuestions: exam.totalQuestions,
        networkingFocusPercentage: exam.networkingFocusPercentage
      }));
    } catch (error) {
      console.error('Failed to fetch available exams:', error);
      return [];
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Clear cache (useful for development or data updates)
  clearCache(): void {
    this.cache.clear();
    this.allExamsCache = null;
  }
}

// Export singleton instance
export const examService = new ExamService();
