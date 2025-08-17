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
        for (const moduleItem of topic.modules) {
          modulesToInsert.push({
            topic_id: topicId,
            module_name: moduleItem
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
        module_name: question.module,
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
          module_name: question.module,
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
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', examId)
        .eq('is_active', true);

      await supabase
        .from('exams')
        .update({ total_questions: questionsCount || 0 })
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
    console.log('getExamQuestions called with:', { examId, options });
    
    // First, let's check if there are any questions at all for this exam
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from('questions')
      .select('id, topic_id, is_active')
      .eq('exam_id', examId);
    
    console.log('All questions for exam:', {
      totalQuestions: allQuestions?.length || 0,
      activeQuestions: allQuestions?.filter(q => q.is_active)?.length || 0,
      topics: allQuestions?.map(q => q.topic_id).filter(Boolean),
      error: allQuestionsError
    });
    
    let query = supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .eq('is_active', true);

    if (options.topicIds && options.topicIds.length > 0) {
      query = query.in('topic_id', options.topicIds);
      console.log('Filtering by topics:', options.topicIds);
    } else {
      console.log('No topics specified, fetching all questions for exam');
    }
    // If no topics are specified, fetch all questions for the exam

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

    console.log('Query result:', {
      dataCount: data?.length || 0,
      count,
      hasError: !!error
    });

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

  async getUserActiveSessions(userId: string): Promise<ParsedUserExamSession[]> {
    const { data, error } = await supabase
      .from('user_exam_sessions')
      .select(`
        id,
        user_id,
        exam_id,
        session_name,
        status,
        selected_topics,
        question_limit,
        total_questions,
        current_question_index,
        time_spent_seconds,
        start_time,
        end_time,
        questions_answered,
        correct_answers,
        score,
        created_at,
        updated_at,
        last_activity
      `)
      .eq('user_id', userId)
      .in('status', ['in_progress', 'paused'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user active sessions: ${error.message}`);
    }

    return (data || []).map(session => ({
      ...session,
      selected_topics: session.selected_topics ? JSON.parse(session.selected_topics) : [],
      questions: [] // Questions are loaded separately when needed
    }));
  }

  async createSession(userId: string, sessionData: CreateSessionRequest): Promise<UserSessionResponse> {
    console.log('Creating session with data:', {
      examId: sessionData.exam_id,
      selectedTopics: sessionData.selected_topics,
      questionLimit: sessionData.question_limit
    });

    // Get exam questions based on selected topics
    const questionsResponse = await this.getExamQuestions(sessionData.exam_id, {
      topicIds: sessionData.selected_topics,
      limit: sessionData.question_limit,
      shuffle: true
    });

    console.log('Questions response:', {
      questionsCount: questionsResponse.questions.length,
      totalCount: questionsResponse.total_count
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
    console.log('getSession called with:', { sessionId, userId });
    
    const { data: session, error: sessionError } = await supabase
      .from('user_exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    console.log('Session data fetched:', { sessionId: session.id, examId: session.exam_id });

    // Get session questions in order
    const { data: sessionQuestions, error: questionsError } = await supabase
      .from('session_questions')
      .select('question_order, question_id')
      .eq('session_id', sessionId)
      .order('question_order');

    if (questionsError) {
      throw new Error(`Failed to fetch session questions: ${questionsError.message}`);
    }

    console.log('Session questions fetched:', {
      sessionQuestionsCount: sessionQuestions?.length || 0,
      questionIds: sessionQuestions?.map(sq => sq.question_id) || []
    });

    // Fetch questions separately using the question IDs
    let questions: ParsedQuestion[] = [];
    if (sessionQuestions && sessionQuestions.length > 0) {
      const questionIds = sessionQuestions.map(sq => sq.question_id);
      const { data: questionData, error: questionDataError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds)
        .eq('is_active', true);

      if (questionDataError) {
        throw new Error(`Failed to fetch questions: ${questionDataError.message}`);
      }

      // Map questions back to their original order
      const questionMap = new Map(questionData?.map(q => [q.id, q]) || []);
      questions = sessionQuestions
        .map(sq => questionMap.get(sq.question_id))
        .filter(Boolean)
        .map(q => this.transformQuestionData(q));
    }

    console.log('Questions processed:', {
      questionsCount: questions.length,
      questionIds: questions.map(q => q.id)
    });

    // Load existing answers for this session
    const { data: existingAnswers, error: answersError } = await supabase
      .from('user_answers')
      .select('*')
      .eq('session_id', sessionId)
      .order('answered_at');

    if (answersError) {
      console.warn('Failed to load existing answers:', answersError.message);
    }

    const parsedSession = this.transformSessionData(session, questions);
    
    // Add existing answers to the session response
    const parsedAnswers = (existingAnswers || []).map(this.transformAnswerData);
    
    return { 
      session: parsedSession,
      answers: parsedAnswers
    };
  }

  async getUserSessions(userId: string): Promise<UserSessionsResponse> {
    const { data, error } = await supabase
      .from('user_exam_sessions')
      .select(`
        id,
        exam_id,
        status,
        session_name,
        current_question_index,
        last_activity,
        total_questions,
        questions_answered,
        correct_answers,
        score,
        time_spent_seconds
      `)
      .eq('user_id', userId)
      .order('last_activity', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user sessions: ${error.message}`);
    }

    console.log('Raw session data:', data);
    
    // Fetch exam titles separately since the join isn't working properly
    const examIds = [...new Set((data || []).map(session => session.exam_id))];
    const { data: examTitles, error: examError } = await supabase
      .from('exams')
      .select('id, title')
      .in('id', examIds);
    
    const examTitleMap = new Map(examTitles?.map(exam => [exam.id, exam.title]) || []);
    
    console.log('Exam titles fetched:', { examIds, examTitles, examError });
    
    const sessions = (data || []).map(session => {
      const examTitle = examTitleMap.get(session.exam_id) || 'Unknown Exam';
      
      console.log('Processing session:', {
        id: session.id,
        exam_id: session.exam_id,
        examTitle,
        total_questions: session.total_questions
      });
      
      return {
        id: session.id,
        exam_id: session.exam_id,
        exam_title: examTitle,
        status: session.status as SessionStatus,
        session_name: session.session_name,
        current_question_index: session.current_question_index || 0,
        progress: session.total_questions > 0 ? (session.questions_answered / session.total_questions) * 100 : 0,
        score: session.score,
        last_activity: session.last_activity,
        total_questions: session.total_questions,
        questions_answered: session.questions_answered,
        time_spent_seconds: session.time_spent_seconds || 0
      };
    });

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

  async deleteSession(sessionId: string): Promise<void> {
    // First delete related user answers
    const { error: answersError } = await supabase
      .from('user_answers')
      .delete()
      .eq('session_id', sessionId);

    if (answersError) {
      throw new Error(`Failed to delete session answers: ${answersError.message}`);
    }

    // Then delete session questions
    const { error: questionsError } = await supabase
      .from('session_questions')
      .delete()
      .eq('session_id', sessionId);

    if (questionsError) {
      throw new Error(`Failed to delete session questions: ${questionsError.message}`);
    }

    // Finally delete the session
    const { error: sessionError } = await supabase
      .from('user_exam_sessions')
      .delete()
      .eq('id', sessionId);

    if (sessionError) {
      throw new Error(`Failed to delete session: ${sessionError.message}`);
    }
  }

  // =====================
  // ANSWER OPERATIONS
  // =====================

  async submitAnswer(sessionId: string, answerData: SubmitAnswerRequest): Promise<ParsedUserAnswer> {
    // Check if answer already exists to prevent conflicts
    const { data: existingAnswer } = await supabase
      .from('user_answers')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_id', answerData.question_id)
      .single();

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

    const answerPayload = {
      session_id: sessionId,
      question_id: answerData.question_id,
      user_answer: JSON.stringify(answerData.user_answer),
      is_correct: isCorrect,
      is_flagged: answerData.is_flagged || false,
      time_spent_seconds: answerData.time_spent_seconds || 0
    };

    let answer;
    
    if (existingAnswer) {
      // Update existing answer
      const { data: updatedAnswer, error: updateError } = await supabase
        .from('user_answers')
        .update({
          ...answerPayload,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAnswer.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update answer: ${updateError.message}`);
      }
      answer = updatedAnswer;
    } else {
      // Insert new answer
      const { data: insertedAnswer, error: insertError } = await supabase
        .from('user_answers')
        .insert(answerPayload)
        .select()
        .single();

      if (insertError) {
        // If it's a duplicate key error (race condition), try to fetch the existing answer
        if (insertError.message.includes('duplicate key value violates unique constraint')) {
          const { data: raceAnswer } = await supabase
            .from('user_answers')
            .select('*')
            .eq('session_id', sessionId)
            .eq('question_id', answerData.question_id)
            .single();
          
          if (raceAnswer) {
            // Found the answer created by the race condition, update it instead
            const { data: updatedAnswer, error: raceUpdateError } = await supabase
              .from('user_answers')
              .update({
                ...answerPayload,
                updated_at: new Date().toISOString()
              })
              .eq('id', raceAnswer.id)
              .select()
              .single();

            if (raceUpdateError) {
              throw new Error(`Failed to update answer after race condition: ${raceUpdateError.message}`);
            }
            answer = updatedAnswer;
          } else {
            throw new Error(`Failed to handle race condition: ${insertError.message}`);
          }
        } else {
          throw new Error(`Failed to insert answer: ${insertError.message}`);
        }
      } else {
        answer = insertedAnswer;
      }
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
        session_id,
        exam_id,
        total_questions,
        correct_answers,
        incorrect_answers,
        unanswered_questions,
        score_percentage,
        pass_status,
        completed_at,
        time_spent_seconds,
        average_time_per_question
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user results: ${error.message}`);
    }

    // Fetch exam titles separately
    const examIds = [...new Set((data || []).map(result => result.exam_id))];
    const { data: examTitles, error: examError } = await supabase
      .from('exams')
      .select('id, title')
      .in('id', examIds);
    
    const examTitleMap = new Map(examTitles?.map(exam => [exam.id, exam.title]) || []);

    const results = (data || []).map(result => ({
      id: result.id,
      session_id: result.session_id,
      exam_id: result.exam_id,
      exam_title: examTitleMap.get(result.exam_id) || 'Unknown Exam',
      total_questions: result.total_questions,
      correct_answers: result.correct_answers,
      incorrect_answers: result.incorrect_answers,
      unanswered_questions: result.unanswered_questions || 0,
      score_percentage: result.score_percentage,
      pass_status: result.pass_status,
      completed_at: result.completed_at,
      time_spent_seconds: result.time_spent_seconds,
      average_time_per_question: result.average_time_per_question || 0
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

  // Get detailed session information including questions and answers
  async getSessionDetails(sessionId: string, userId: string): Promise<any> {
    // First verify the session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('user_exam_sessions')
      .select(`
        *,
        exams:exams(id, title, description)
      `)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found or access denied');
    }

    // Get session questions with their order
    const { data: sessionQuestions, error: questionsError } = await supabase
      .from('session_questions')
      .select(`
        question_order,
        questions:questions(
          id,
          question_text,
          options,
          correct_answers,
          explanation,
          reasoning,
          topic_id,
          module,
          category,
          type,
          difficulty
        )
      `)
      .eq('session_id', sessionId)
      .order('question_order');

    if (questionsError) {
      throw new Error(`Failed to fetch session questions: ${questionsError.message}`);
    }

    // Get user answers for this session
    const { data: userAnswers, error: answersError } = await supabase
      .from('user_answers')
      .select(`
        question_id,
        user_answer,
        is_correct,
        time_spent_seconds,
        answered_at
      `)
      .eq('session_id', sessionId);

    if (answersError) {
      throw new Error(`Failed to fetch user answers: ${answersError.message}`);
    }

    // Get topics for context
    const topicIds = [...new Set(sessionQuestions?.map(sq => {
      const question = sq.questions as any;
      return question?.topic_id;
    }).filter(Boolean) || [])];
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name')
      .in('id', topicIds);

    if (topicsError) {
      console.warn('Failed to fetch topics:', topicsError);
    }

    const topicMap = new Map(topics?.map(t => [t.id, t.name]) || []);

    // Combine all the data
    const detailedSession = {
      session: {
        id: session.id,
        exam_id: session.exam_id,
        exam_title: session.exams?.title || 'Unknown Exam',
        session_name: session.session_name,
        status: session.status,
        total_questions: session.total_questions,
        questions_answered: session.questions_answered,
        correct_answers: session.correct_answers,
        score: session.score,
        time_spent_seconds: session.time_spent_seconds,
        start_time: session.start_time,
        end_time: session.end_time,
        last_activity: session.last_activity
      },
      questions: sessionQuestions?.map(sq => {
        const question = Array.isArray(sq.questions) ? sq.questions[0] : sq.questions;
        if (!question) return null;
        
        const userAnswer = userAnswers?.find(ua => ua.question_id === question.id);
        const topicName = topicMap.get(question.topic_id) || 'Unknown Topic';
        
        return {
          id: question.id,
          order: sq.question_order,
          question_text: question.question_text,
          options: typeof question.options === 'string' ? JSON.parse(question.options) : question.options,
          correct_answers: typeof question.correct_answers === 'string' ? JSON.parse(question.correct_answers) : question.correct_answers,
          explanation: question.explanation,
          reasoning: question.reasoning,
          topic_id: question.topic_id,
          topic_name: topicName,
          module: question.module,
          category: question.category,
          type: question.type,
          difficulty: question.difficulty,
          user_answer: userAnswer?.user_answer ? 
            (typeof userAnswer.user_answer === 'string' ? JSON.parse(userAnswer.user_answer) : userAnswer.user_answer) : 
            null,
          is_correct: userAnswer?.is_correct || null,
          time_spent: userAnswer?.time_spent_seconds || 0,
          answered_at: userAnswer?.answered_at || null
        };
      }).filter(Boolean) || [],
      summary: {
        total_questions: session.total_questions,
        questions_answered: session.questions_answered,
        correct_answers: session.correct_answers,
        incorrect_answers: (session.questions_answered || 0) - (session.correct_answers || 0),
        unanswered_questions: (session.total_questions || 0) - (session.questions_answered || 0),
        accuracy: session.total_questions > 0 ? ((session.correct_answers || 0) / session.total_questions) * 100 : 0,
        time_spent_minutes: Math.round((session.time_spent_seconds || 0) / 60),
        average_time_per_question: session.questions_answered > 0 ? Math.round((session.time_spent_seconds || 0) / session.questions_answered) : 0
      }
    };

    return detailedSession;
  }
}

// Export singleton instance
export const supabaseExamService = new SupabaseExamService();