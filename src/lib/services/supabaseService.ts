/**
 * Comprehensive Supabase service layer for exam system
 * 
 * This service provides CRUD operations for all database tables
 * with proper error handling, type safety, and data transformation.
 */

import { supabase } from '../supabase';
import {
  DbExam,
  DbTopic,
  DbTopicModule,
  DbQuestion,
  DbCertificationInfo,
  DbUserExamSession,
  DbSessionQuestion,
  DbUserAnswer,
  DbExamResult,
  DbUserPreferences,
  ParsedExam,
  ParsedTopic,
  ParsedQuestion,
  ParsedCertificationInfo,
  ParsedUserExamSession,
  ParsedUserAnswer,
  ParsedExamResult,
  ParsedUserPreferences,
  CreateExamRequest,
  UpdateExamRequest,
  CreateSessionRequest,
  UpdateSessionRequest,
  SubmitAnswerRequest,
  ExamListResponse,
  ExamDetailResponse,
  ExamQuestionsResponse,
  UserSessionResponse,
  UserSessionsResponse,
  ExamResultResponse,
  ExamResultsResponse,
  QuestionReasoning,
  QuestionReference,
  SessionStatus,
  ExamDifficulty
} from '../types';

export class SupabaseExamService {
  
  // =====================
  // EXAM OPERATIONS
  // =====================
  
  async getExams(): Promise<ExamListResponse> {
    const { data, error } = await supabase
      .from('exams')
      .select('id, title, description, total_questions, networking_focus_percentage')
      .eq('is_active', true)
      .order('title');

    if (error) {
      throw new Error(`Failed to fetch exams: ${error.message}`);
    }

    return { exams: data || [] };
  }

  async getExamById(examId: string): Promise<ExamDetailResponse> {
    // Get exam with topics and certification info
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select(`
        *,
        topics:topics(*),
        certification_info:certification_info(*)
      `)
      .eq('id', examId)
      .eq('is_active', true)
      .single();

    if (examError) {
      throw new Error(`Failed to fetch exam: ${examError.message}`);
    }

    if (!examData) {
      throw new Error('Exam not found');
    }

    // Get topic modules
    const topicIds = examData.topics.map((t: DbTopic) => t.id);
    const { data: modulesData, error: modulesError } = await supabase
      .from('topic_modules')
      .select('*')
      .in('topic_id', topicIds);

    if (modulesError) {
      throw new Error(`Failed to fetch topic modules: ${modulesError.message}`);
    }

    const exam = this.transformExamData(examData, modulesData || []);
    return { exam };
  }

  async createExam(examData: CreateExamRequest): Promise<ParsedExam> {
    // Start transaction-like operations
    try {
      // 1. Create exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          id: examData.id,
          title: examData.title,
          description: examData.description || null,
          total_questions: examData.questions.length,
          certification_guide_url: examData.certification_guide_url || null,
          study_guide_url: examData.study_guide_url || null,
        })
        .select()
        .single();

      if (examError) throw examError;

      // 2. Create topics
      const topicsToInsert = examData.topics.map(topic => ({
        id: `${examData.id}-${topic.id}`,
        exam_id: examData.id,
        name: topic.name,
        weight: topic.weight || null,
        weightage: this.parseWeightage(topic.weight)
      }));

      const { error: topicsError } = await supabase
        .from('topics')
        .insert(topicsToInsert);

      if (topicsError) throw topicsError;

      // 3. Create topic modules
      const modulesToInsert = [];
      for (const topic of examData.topics) {
        const topicId = `${examData.id}-${topic.id}`;
        for (const module of topic.modules) {
          modulesToInsert.push({
            topic_id: topicId,
            module_name: module
          });
        }
      }

      if (modulesToInsert.length > 0) {
        const { error: modulesError } = await supabase
          .from('topic_modules')
          .insert(modulesToInsert);

        if (modulesError) throw modulesError;
      }

      // 4. Create questions
      const questionsToInsert = examData.questions.map(question => ({
        id: question.id,
        exam_id: examData.id,
        topic_id: question.topic_id,
        module: question.module,
        category: question.category,
        type: question.type,
        difficulty: question.difficulty,
        question_text: question.question_text,
        options: JSON.stringify(question.options),
        correct_answers: JSON.stringify(question.correct_answers),
        explanation: question.explanation,
        reasoning: question.reasoning ? JSON.stringify(question.reasoning) : null,
        reference: question.reference ? JSON.stringify(question.reference) : null
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      // 5. Create certification info if provided
      if (examData.certification_info) {
        const { error: certError } = await supabase
          .from('certification_info')
          .insert({
            exam_id: examData.id,
            title: examData.certification_info.title,
            description: examData.certification_info.description,
            exam_code: examData.certification_info.exam_code,
            level: examData.certification_info.level,
            validity: examData.certification_info.validity,
            prerequisites: JSON.stringify(examData.certification_info.prerequisites),
            skills_measured: JSON.stringify(examData.certification_info.skills_measured),
            study_resources: JSON.stringify(examData.certification_info.study_resources),
            exam_details: JSON.stringify(examData.certification_info.exam_details),
            career_path: JSON.stringify(examData.certification_info.career_path)
          });

        if (certError) throw certError;
      }

      // Return the created exam
      const result = await this.getExamById(examData.id);
      return result.exam;

    } catch (error: any) {
      // Cleanup on error (implement rollback logic if needed)
      await supabase.from('exams').delete().eq('id', examData.id);
      throw new Error(`Failed to create exam: ${error.message}`);
    }
  }

  async updateExam(examId: string, updateData: UpdateExamRequest): Promise<ParsedExam> {
    try {
      // Update exam metadata if provided
      if (updateData.title || updateData.description) {
        const { error } = await supabase
          .from('exams')
          .update({
            ...(updateData.title && { title: updateData.title }),
            ...(updateData.description && { description: updateData.description }),
            updated_at: new Date().toISOString()
          })
          .eq('id', examId);

        if (error) throw error;
      }

      // Handle question updates
      if (updateData.questions_to_add && updateData.questions_to_add.length > 0) {
        const questionsToInsert = updateData.questions_to_add.map(question => ({
          id: question.id,
          exam_id: examId,
          topic_id: question.topic_id,
          module: question.module,
          category: question.category,
          type: question.type,
          difficulty: question.difficulty,
          question_text: question.question_text,
          options: JSON.stringify(question.options),
          correct_answers: JSON.stringify(question.correct_answers),
          explanation: question.explanation,
          reasoning: question.reasoning ? JSON.stringify(question.reasoning) : null,
          reference: question.reference ? JSON.stringify(question.reference) : null
        }));

        const { error } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (error) throw error;
      }

      if (updateData.questions_to_update && updateData.questions_to_update.length > 0) {
        for (const question of updateData.questions_to_update) {
          const updatePayload: any = {};
          if (question.question_text) updatePayload.question_text = question.question_text;
          if (question.options) updatePayload.options = JSON.stringify(question.options);
          if (question.correct_answers) updatePayload.correct_answers = JSON.stringify(question.correct_answers);
          if (question.explanation) updatePayload.explanation = question.explanation;
          if (question.reasoning) updatePayload.reasoning = JSON.stringify(question.reasoning);
          if (question.reference) updatePayload.reference = JSON.stringify(question.reference);

          const { error } = await supabase
            .from('questions')
            .update(updatePayload)
            .eq('id', question.id)
            .eq('exam_id', examId);

          if (error) throw error;
        }
      }

      if (updateData.questions_to_remove && updateData.questions_to_remove.length > 0) {
        const { error } = await supabase
          .from('questions')
          .update({ is_active: false })
          .in('id', updateData.questions_to_remove)
          .eq('exam_id', examId);

        if (error) throw error;
      }

      // Update total questions count
      const { data: questionsCount } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', examId)
        .eq('is_active', true);

      await supabase
        .from('exams')
        .update({ total_questions: questionsCount?.count || 0 })
        .eq('id', examId);

      // Return updated exam
      const result = await this.getExamById(examId);
      return result.exam;

    } catch (error: any) {
      throw new Error(`Failed to update exam: ${error.message}`);
    }
  }

  // =====================
  // QUESTION OPERATIONS
  // =====================

  async getExamQuestions(
    examId: string,
    options: {
      topicIds?: string[];
      difficulty?: ExamDifficulty;
      limit?: number;
      shuffle?: boolean;
    } = {}
  ): Promise<ExamQuestionsResponse> {
    let query = supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .eq('is_active', true);

    if (options.topicIds && options.topicIds.length > 0) {
      query = query.in('topic_id', options.topicIds);
    }

    if (options.difficulty) {
      query = query.eq('difficulty', options.difficulty);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    let questions = (data || []).map(this.transformQuestionData);

    if (options.shuffle) {
      questions = this.shuffleArray(questions);
    }

    return {
      questions,
      total_count: count || questions.length
    };
  }

  // =====================
  // SESSION OPERATIONS
  // =====================

  async createSession(userId: string, sessionData: CreateSessionRequest): Promise<UserSessionResponse> {
    // Get exam questions based on selected topics
    const questionsResponse = await this.getExamQuestions(sessionData.exam_id, {
      topicIds: sessionData.selected_topics,
      limit: sessionData.question_limit,
      shuffle: true
    });

    const { data: session, error: sessionError } = await supabase
      .from('user_exam_sessions')
      .insert({
        user_id: userId,
        exam_id: sessionData.exam_id,
        session_name: sessionData.session_name,
        selected_topics: JSON.stringify(sessionData.selected_topics || []),
        question_limit: sessionData.question_limit,
        total_questions: questionsResponse.questions.length
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // Create session questions
    const sessionQuestions = questionsResponse.questions.map((question, index) => ({
      session_id: session.id,
      question_id: question.id,
      question_order: index + 1
    }));

    const { error: questionsError } = await supabase
      .from('session_questions')
      .insert(sessionQuestions);

    if (questionsError) {
      throw new Error(`Failed to create session questions: ${questionsError.message}`);
    }

    const parsedSession = this.transformSessionData(session, questionsResponse.questions);
    return { session: parsedSession };
  }

  async getSession(sessionId: string, userId: string): Promise<UserSessionResponse> {
    const { data: session, error: sessionError } = await supabase
      .from('user_exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    // Get session questions in order
    const { data: sessionQuestions, error: questionsError } = await supabase
      .from('session_questions')
      .select(`
        question_order,
        questions:questions(*)
      `)
      .eq('session_id', sessionId)
      .order('question_order');

    if (questionsError) {
      throw new Error(`Failed to fetch session questions: ${questionsError.message}`);
    }

    const questions = (sessionQuestions || [])
      .map(sq => this.transformQuestionData(sq.questions))
      .filter(Boolean);

    const parsedSession = this.transformSessionData(session, questions);
    return { session: parsedSession };
  }

  async getUserSessions(userId: string): Promise<UserSessionsResponse> {
    const { data, error } = await supabase
      .from('user_exam_sessions')
      .select(`
        id,
        exam_id,
        status,
        last_activity,
        total_questions,
        questions_answered,
        correct_answers,
        score,
        exams:exams(title)
      `)
      .eq('user_id', userId)
      .order('last_activity', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user sessions: ${error.message}`);
    }

    const sessions = (data || []).map(session => ({
      id: session.id,
      exam_id: session.exam_id,
      exam_title: session.exams?.title || 'Unknown Exam',
      status: session.status as SessionStatus,
      progress: session.total_questions > 0 ? (session.questions_answered / session.total_questions) * 100 : 0,
      score: session.score,
      last_activity: session.last_activity,
      total_questions: session.total_questions,
      questions_answered: session.questions_answered
    }));

    return { sessions };
  }

  async updateSession(sessionId: string, userId: string, updateData: UpdateSessionRequest): Promise<void> {
    const { error } = await supabase
      .from('user_exam_sessions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  // =====================
  // ANSWER OPERATIONS
  // =====================

  async submitAnswer(sessionId: string, answerData: SubmitAnswerRequest): Promise<ParsedUserAnswer> {
    // Get the correct answer for validation
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('correct_answers')
      .eq('id', answerData.question_id)
      .single();

    if (questionError) {
      throw new Error(`Failed to fetch question: ${questionError.message}`);
    }

    const correctAnswers: number[] = JSON.parse(question.correct_answers);
    const isCorrect = this.compareAnswers(answerData.user_answer, correctAnswers);

    // Upsert user answer
    const { data: answer, error: answerError } = await supabase
      .from('user_answers')
      .upsert({
        session_id: sessionId,
        question_id: answerData.question_id,
        user_answer: JSON.stringify(answerData.user_answer),
        is_correct: isCorrect,
        is_flagged: answerData.is_flagged || false,
        time_spent_seconds: answerData.time_spent_seconds || 0
      })
      .select()
      .single();

    if (answerError) {
      throw new Error(`Failed to submit answer: ${answerError.message}`);
    }

    // Update session statistics
    await this.updateSessionStats(sessionId);

    return this.transformAnswerData(answer);
  }

  async getSessionAnswers(sessionId: string): Promise<ParsedUserAnswer[]> {
    const { data, error } = await supabase
      .from('user_answers')
      .select('*')
      .eq('session_id', sessionId)
      .order('answered_at');

    if (error) {
      throw new Error(`Failed to fetch session answers: ${error.message}`);
    }

    return (data || []).map(this.transformAnswerData);
  }

  // =====================
  // EXAM RESULT OPERATIONS
  // =====================

  async completeSession(sessionId: string): Promise<ExamResultResponse> {
    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('user_exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    // Get all answers for the session
    const { data: answers, error: answersError } = await supabase
      .from('user_answers')
      .select(`
        *,
        questions:questions(topic_id, difficulty)
      `)
      .eq('session_id', sessionId);

    if (answersError) {
      throw new Error(`Failed to fetch answers: ${answersError.message}`);
    }

    // Calculate statistics
    const totalQuestions = session.total_questions;
    const answeredQuestions = answers?.length || 0;
    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
    const incorrectAnswers = answeredQuestions - correctAnswers;
    const unansweredQuestions = totalQuestions - answeredQuestions;
    const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const averageTimePerQuestion = answeredQuestions > 0 ? session.time_spent_seconds / answeredQuestions : 0;

    // Calculate topic and difficulty scores
    const topicScores = this.calculateTopicScores(answers || []);
    const difficultyScores = this.calculateDifficultyScores(answers || []);

    // Create exam result
    const { data: result, error: resultError } = await supabase
      .from('exam_results')
      .insert({
        session_id: sessionId,
        user_id: session.user_id,
        exam_id: session.exam_id,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_questions: unansweredQuestions,
        score_percentage: scorePercentage,
        time_spent_seconds: session.time_spent_seconds,
        average_time_per_question: averageTimePerQuestion,
        topic_scores: JSON.stringify(topicScores),
        difficulty_scores: JSON.stringify(difficultyScores)
      })
      .select()
      .single();

    if (resultError) {
      throw new Error(`Failed to create exam result: ${resultError.message}`);
    }

    // Update session status
    await supabase
      .from('user_exam_sessions')
      .update({
        status: 'completed' as SessionStatus,
        end_time: new Date().toISOString(),
        score: scorePercentage
      })
      .eq('id', sessionId);

    const parsedResult = this.transformResultData(result);
    return { result: parsedResult };
  }

  async getUserResults(userId: string): Promise<ExamResultsResponse> {
    const { data, error } = await supabase
      .from('exam_results')
      .select(`
        id,
        exam_id,
        score_percentage,
        pass_status,
        completed_at,
        time_spent_seconds,
        exams:exams(title)
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user results: ${error.message}`);
    }

    const results = (data || []).map(result => ({
      id: result.id,
      exam_id: result.exam_id,
      exam_title: result.exams?.title || 'Unknown Exam',
      score_percentage: result.score_percentage,
      pass_status: result.pass_status,
      completed_at: result.completed_at,
      time_spent_seconds: result.time_spent_seconds
    }));

    return { results };
  }

  // =====================
  // USER PREFERENCES
  // =====================

  async getUserPreferences(userId: string): Promise<ParsedUserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, create default
        return this.createDefaultPreferences(userId);
      }
      throw new Error(`Failed to fetch user preferences: ${error.message}`);
    }

    return this.transformPreferencesData(data);
  }

  async updateUserPreferences(userId: string, preferences: Partial<ParsedUserPreferences>): Promise<ParsedUserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        ...(preferences.default_topics && { default_topics: JSON.stringify(preferences.default_topics) })
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }

    return this.transformPreferencesData(data);
  }

  // =====================
  // HELPER METHODS
  // =====================

  private transformExamData(examData: any, modulesData: DbTopicModule[]): ParsedExam {
    const modulesByTopic = modulesData.reduce((acc, module) => {
      if (!acc[module.topic_id]) {
        acc[module.topic_id] = [];
      }
      acc[module.topic_id].push(module);
      return acc;
    }, {} as Record<string, DbTopicModule[]>);

    const topics: ParsedTopic[] = examData.topics.map((topic: DbTopic) => ({
      ...topic,
      modules: modulesByTopic[topic.id] || []
    }));

    let certificationInfo: ParsedCertificationInfo | null = null;
    if (examData.certification_info && examData.certification_info.length > 0) {
      const cert = examData.certification_info[0];
      certificationInfo = {
        ...cert,
        prerequisites: cert.prerequisites ? JSON.parse(cert.prerequisites) : [],
        skills_measured: cert.skills_measured ? JSON.parse(cert.skills_measured) : [],
        study_resources: cert.study_resources ? JSON.parse(cert.study_resources) : [],
        exam_details: cert.exam_details ? JSON.parse(cert.exam_details) : {},
        career_path: cert.career_path ? JSON.parse(cert.career_path) : []
      };
    }

    return {
      ...examData,
      topics,
      certification_info: certificationInfo
    };
  }

  private transformQuestionData(questionData: DbQuestion): ParsedQuestion {
    return {
      ...questionData,
      options: JSON.parse(questionData.options),
      correct_answers: JSON.parse(questionData.correct_answers),
      reasoning: questionData.reasoning ? JSON.parse(questionData.reasoning) as QuestionReasoning : null,
      reference: questionData.reference ? JSON.parse(questionData.reference) as QuestionReference : null
    };
  }

  private transformSessionData(sessionData: DbUserExamSession, questions: ParsedQuestion[]): ParsedUserExamSession {
    return {
      ...sessionData,
      selected_topics: sessionData.selected_topics ? JSON.parse(sessionData.selected_topics) : [],
      questions
    };
  }

  private transformAnswerData(answerData: DbUserAnswer): ParsedUserAnswer {
    return {
      ...answerData,
      user_answer: JSON.parse(answerData.user_answer)
    };
  }

  private transformResultData(resultData: DbExamResult): ParsedExamResult {
    return {
      ...resultData,
      topic_scores: resultData.topic_scores ? JSON.parse(resultData.topic_scores) : null,
      difficulty_scores: resultData.difficulty_scores ? JSON.parse(resultData.difficulty_scores) : null
    };
  }

  private transformPreferencesData(preferencesData: DbUserPreferences): ParsedUserPreferences {
    return {
      ...preferencesData,
      default_topics: preferencesData.default_topics ? JSON.parse(preferencesData.default_topics) : []
    };
  }

  private async createDefaultPreferences(userId: string): Promise<ParsedUserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        theme: 'system',
        default_topics: '[]',
        keyboard_navigation: true,
        show_detailed_explanations: true,
        auto_save_interval_seconds: 30
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default preferences: ${error.message}`);
    }

    return this.transformPreferencesData(data);
  }

  private parseWeightage(weight: string | undefined): number | null {
    if (!weight) return null;
    const match = weight.match(/(\d+)-?(\d+)?%?/);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : min;
      return (min + max) / 2;
    }
    return null;
  }

  private compareAnswers(userAnswer: number[], correctAnswer: number[]): boolean {
    if (userAnswer.length !== correctAnswer.length) return false;
    return userAnswer.sort().every((answer, index) => answer === correctAnswer.sort()[index]);
  }

  private async updateSessionStats(sessionId: string): Promise<void> {
    // Get current stats
    const { data: answers } = await supabase
      .from('user_answers')
      .select('is_correct')
      .eq('session_id', sessionId);

    if (answers) {
      const questionsAnswered = answers.length;
      const correctAnswers = answers.filter(a => a.is_correct).length;

      await supabase
        .from('user_exam_sessions')
        .update({
          questions_answered: questionsAnswered,
          correct_answers: correctAnswers,
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId);
    }
  }

  private calculateTopicScores(answers: any[]): Record<string, { correct: number; total: number; percentage: number }> {
    const topicStats: Record<string, { correct: number; total: number }> = {};

    answers.forEach(answer => {
      const topicId = answer.questions?.topic_id;
      if (topicId) {
        if (!topicStats[topicId]) {
          topicStats[topicId] = { correct: 0, total: 0 };
        }
        topicStats[topicId].total++;
        if (answer.is_correct) {
          topicStats[topicId].correct++;
        }
      }
    });

    const result: Record<string, { correct: number; total: number; percentage: number }> = {};
    Object.entries(topicStats).forEach(([topicId, stats]) => {
      result[topicId] = {
        ...stats,
        percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      };
    });

    return result;
  }

  private calculateDifficultyScores(answers: any[]): Record<ExamDifficulty, { correct: number; total: number; percentage: number }> {
    const difficultyStats: Record<ExamDifficulty, { correct: number; total: number }> = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      difficult: { correct: 0, total: 0 }
    };

    answers.forEach(answer => {
      const difficulty = answer.questions?.difficulty as ExamDifficulty;
      if (difficulty) {
        difficultyStats[difficulty].total++;
        if (answer.is_correct) {
          difficultyStats[difficulty].correct++;
        }
      }
    });

    const result: Record<ExamDifficulty, { correct: number; total: number; percentage: number }> = {} as any;
    Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
      result[difficulty as ExamDifficulty] = {
        ...stats,
        percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      };
    });

    return result;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export singleton instance
export const supabaseExamService = new SupabaseExamService();