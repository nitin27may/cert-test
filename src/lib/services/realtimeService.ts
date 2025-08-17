/**
 * Optimized Supabase Real-time Service
 * 
 * This service leverages Supabase's built-in real-time capabilities for:
 * - Automatic table synchronization via Postgres Changes
 * - Real-time broadcasting for session updates
 * - Presence tracking for active users
 * - Optimized subscriptions with proper filtering
 */

import { supabase } from '../supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface RealtimeSubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

export interface SessionBroadcastData {
  type: 'session_update' | 'answer_submitted' | 'question_navigated' | 'session_paused' | 'session_completed';
  sessionId: string;
  userId: string;
  data: any;
  timestamp: string;
}

export interface UserPresenceData {
  userId: string;
  sessionId?: string;
  examId?: string;
  currentQuestionIndex?: number;
  isActive: boolean;
  lastSeen: string;
}

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceState: Map<string, UserPresenceData> = new Map();

  /**
   * Subscribe to automatic table changes with optimized filtering
   */
  async subscribeToTableChanges<T extends Record<string, any> = any>(
    channelName: string,
    config: RealtimeSubscriptionConfig,
    onData: (payload: RealtimePostgresChangesPayload<T>) => void,
    onError?: (error: any) => void
  ): Promise<RealtimeChannel> {
    // Remove existing channel if it exists
    await this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          ...(config.filter && { filter: config.filter })
        },
        (payload) => {
          try {
            onData(payload as any);
          } catch (error) {
            console.error(`Error handling table change for ${channelName}:`, error);
            onError?.(error);
          }
        }
      );

    // Add error handling - use the error callback from subscribe result

    try {
      await channel.subscribe();
    } catch (error) {
      console.error(`Failed to subscribe to ${channelName}:`, error);
      onError?.(error);
      throw error;
    }

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to exam session updates with automatic sync
   */
  async subscribeToExamSession(
    sessionId: string,
    userId: string,
    callbacks: {
      onSessionUpdate?: (session: any) => void;
      onAnswerUpdate?: (answer: any) => void;
      onQuestionUpdate?: (sessionQuestion: any) => void;
      onBroadcast?: (data: SessionBroadcastData) => void;
      onError?: (error: any) => void;
    }
  ): Promise<RealtimeChannel> {
    const channelName = `exam_session_${sessionId}`;

    // Remove existing subscription
    await this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      // Session updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_exam_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          callbacks.onSessionUpdate?.(payload.new);
        }
      )
      // Answer updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_answers',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new) {
            // Parse JSON fields
            const answer = {
              ...payload.new,
              user_answer: (payload.new as any).user_answer ? JSON.parse((payload.new as any).user_answer) : []
            };
            callbacks.onAnswerUpdate?.(answer);
          }
        }
      )
      // Session questions updates (for question order changes)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_questions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          callbacks.onQuestionUpdate?.(payload.new);
        }
      )
      // Broadcast channel for real-time session events
      .on('broadcast', { event: 'session_event' }, (payload) => {
        const data = payload.payload as SessionBroadcastData;
        if (data.sessionId === sessionId) {
          callbacks.onBroadcast?.(data);
        }
      });

    // Error handling - will be handled by subscribe result

    try {
      await channel.subscribe();
    } catch (error) {
      console.error(`Failed to subscribe to exam session:`, error);
      throw error;
    }

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to user exam results with automatic sync
   */
  async subscribeToUserResults(
    userId: string,
    onResultUpdate: (result: any) => void,
    onError?: (error: any) => void
  ): Promise<RealtimeChannel> {
    const channelName = `user_results_${userId}`;

    return this.subscribeToTableChanges(
      channelName,
      {
        table: 'exam_results',
        event: '*',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onResultUpdate(payload.new || payload.old);
      },
      onError
    );
  }

  /**
   * Subscribe to exam content updates (for admin/content management)
   */
  async subscribeToExamContent(
    examId: string,
    callbacks: {
      onExamUpdate?: (exam: any) => void;
      onTopicUpdate?: (topic: any) => void;
      onQuestionUpdate?: (question: any) => void;
      onError?: (error: any) => void;
    }
  ): Promise<RealtimeChannel[]> {
    const channels: RealtimeChannel[] = [];

    // Exam updates
    if (callbacks.onExamUpdate) {
      const examChannel = await this.subscribeToTableChanges(
        `exam_${examId}`,
        {
          table: 'exams',
          event: '*',
          filter: `id=eq.${examId}`
        },
        (payload) => callbacks.onExamUpdate!(payload.new || payload.old),
        callbacks.onError
      );
      channels.push(examChannel);
    }

    // Topic updates
    if (callbacks.onTopicUpdate) {
      const topicChannel = await this.subscribeToTableChanges(
        `exam_topics_${examId}`,
        {
          table: 'topics',
          event: '*',
          filter: `exam_id=eq.${examId}`
        },
        (payload) => callbacks.onTopicUpdate!(payload.new || payload.old),
        callbacks.onError
      );
      channels.push(topicChannel);
    }

    // Question updates
    if (callbacks.onQuestionUpdate) {
      const questionChannel = await this.subscribeToTableChanges(
        `exam_questions_${examId}`,
        {
          table: 'questions',
          event: '*',
          filter: `exam_id=eq.${examId}`
        },
        (payload) => {
          const question = payload.new || payload.old;
          if (question) {
            // Parse JSON fields
            const parsedQuestion = {
              ...question,
              options: question.options ? JSON.parse(question.options) : [],
              correct_answers: question.correct_answers ? JSON.parse(question.correct_answers) : [],
              reasoning: question.reasoning ? JSON.parse(question.reasoning) : null,
              reference: question.reference ? JSON.parse(question.reference) : null
            };
            callbacks.onQuestionUpdate!(parsedQuestion);
          }
        },
        callbacks.onError
      );
      channels.push(questionChannel);
    }

    return channels;
  }

  /**
   * Broadcast session events to other clients
   */
  async broadcastSessionEvent(
    sessionId: string,
    data: Omit<SessionBroadcastData, 'timestamp'>
  ): Promise<void> {
    const channelName = `exam_session_${sessionId}`;
    const channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`No channel found for session ${sessionId}`);
      return;
    }

    const payload: SessionBroadcastData = {
      ...data,
      timestamp: new Date().toISOString()
    };

    try {
      await channel.send({
        type: 'broadcast',
        event: 'session_event',
        payload
      });
    } catch (error) {
      console.error('Failed to broadcast session event:', error);
      throw error;
    }
  }

  /**
   * Track user presence in exam sessions
   */
  async trackUserPresence(
    sessionId: string,
    presenceData: UserPresenceData,
    onPresenceUpdate?: (presences: UserPresenceData[]) => void
  ): Promise<RealtimeChannel> {
    const channelName = `presence_${sessionId}`;

    // Remove existing presence channel
    await this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const presences: UserPresenceData[] = [];

        Object.keys(presenceState).forEach(key => {
          const presence = presenceState[key];
          if (presence && presence.length > 0) {
            presences.push(presence[0] as unknown as UserPresenceData);
          }
        });

        this.presenceState.set(sessionId, presenceData);
        onPresenceUpdate?.(presences);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      });

    // Track current user's presence
    try {
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(presenceData);
        }
      });
    } catch (error) {
      console.error('Failed to track presence:', error);
      throw error;
    }

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Update user presence data
   */
  async updatePresence(
    sessionId: string,
    updates: Partial<UserPresenceData>
  ): Promise<void> {
    const channelName = `presence_${sessionId}`;
    const channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`No presence channel found for session ${sessionId}`);
      return;
    }

    const currentPresence = this.presenceState.get(sessionId);
    if (currentPresence) {
      const updatedPresence = {
        ...currentPresence,
        ...updates,
        lastSeen: new Date().toISOString()
      };

      await channel.track(updatedPresence);
      this.presenceState.set(sessionId, updatedPresence);
    }
  }

  /**
   * Get current presence state for a session
   */
  getPresenceState(sessionId: string): UserPresenceData | null {
    return this.presenceState.get(sessionId) || null;
  }

  /**
   * Auto-sync functionality with optimized batching
   */
  createAutoSyncManager(
    sessionId: string,
    options: {
      batchInterval?: number; // milliseconds
      maxBatchSize?: number;
      onSyncError?: (error: any) => void;
    } = {}
  ) {
    const {
      batchInterval = 5000, // 5 seconds
      maxBatchSize = 10,
      onSyncError
    } = options;

    const syncQueue: Array<{ type: string; data: any; timestamp: number }> = [];
    let syncTimer: NodeJS.Timeout | null = null;

    const processSyncQueue = async () => {
      if (syncQueue.length === 0) return;

      try {
        const batch = syncQueue.splice(0, maxBatchSize);
        
        // Group by type for efficient processing
        const grouped = batch.reduce((acc, item) => {
          if (!acc[item.type]) acc[item.type] = [];
          acc[item.type].push(item.data);
          return acc;
        }, {} as Record<string, any[]>);

        // Process each type
        for (const [type, items] of Object.entries(grouped)) {
          await this.broadcastSessionEvent(sessionId, {
            type: 'session_update' as any,
            sessionId,
            userId: '', // Will be set by the caller
            data: { type, items }
          });
        }

      } catch (error) {
        console.error('Auto-sync error:', error);
        onSyncError?.(error);
      }
    };

    const scheduleSync = () => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(processSyncQueue, batchInterval);
    };

    return {
      queueSync: (type: string, data: any) => {
        syncQueue.push({
          type,
          data,
          timestamp: Date.now()
        });

        // Immediate sync if queue is full
        if (syncQueue.length >= maxBatchSize) {
          processSyncQueue();
        } else {
          scheduleSync();
        }
      },

      forceSync: () => {
        if (syncTimer) {
          clearTimeout(syncTimer);
          syncTimer = null;
        }
        return processSyncQueue();
      },

      destroy: () => {
        if (syncTimer) {
          clearTimeout(syncTimer);
          syncTimer = null;
        }
        syncQueue.length = 0;
      }
    };
  }

  /**
   * Unsubscribe from a specific channel
   */
  async unsubscribe(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (channel) {
      await supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll(): Promise<void> {
    const unsubscribePromises = Array.from(this.channels.keys()).map(
      channelName => this.unsubscribe(channelName)
    );
    await Promise.all(unsubscribePromises);
    this.presenceState.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
    // Use SDK capability if present (future/back-compat)
    const rt: any = (supabase as any).realtime;
    if (rt && typeof rt.getStatus === 'function') {
      return rt.getStatus();
    }

    // Derive status from channels as a fallback
    try {
      // Offline check
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return 'CLOSED';
      }

      const channels = supabase.getChannels?.() || [];
      if (!channels.length) return 'CLOSED';

      const states = channels
        .map((c: any) => c?.state || c?.status || c?.connectionState)
        .filter(Boolean)
        .map((s: any) => String(s).toUpperCase());

      if (states.some(s => s.includes('CLOSING'))) return 'CLOSING';
      if (states.some(s => s.includes('SUBSCRIBED') || s.includes('JOINED'))) return 'OPEN';
      if (states.some(s => s.includes('SUBSCRIBING') || s.includes('JOINING') || s.includes('CONNECT'))) return 'CONNECTING';

      // Default when channels exist but state unknown
      return 'OPEN';
    } catch {
      // Conservative default
      return 'OPEN';
    }
  }

  /**
   * Enable/disable real-time for specific tables (admin function)
   */
  async enableTableRealtime(tableName: string): Promise<void> {
    // This would typically be done through Supabase Dashboard or SQL
    // But can be automated via API if needed
    console.log(`Enable real-time for table: ${tableName}`);
    // Implementation would depend on your admin setup
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();