import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://ajqvbronozcyoftkjmja.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcXZicm9ub3pjeW9mdGtqbWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMjQ5MDksImV4cCI6MjEwNDYwMDkwOX0.wz55nh8IWrH-vZ7rDDQCeLpp7bjydGV8K6WJejdPZ6Q';

export class SupabaseService {
  constructor() {
    this.client = null;
    this.currentUser = null;
    this.init();
  }

  init() {
    try {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      console.log('⚡ Supabase Service initialized for project: ajqvbronozcyoftkjmja');
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
    }
  }

  // Fetch top leaderboard entries
  async getLeaderboard(limit = 10) {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('leaderboard')
        .select('*')
        .limit(limit);

      if (error) {
        // Fallback if view doesn't exist yet, query profiles directly
        const { data: profData, error: profError } = await this.client
          .from('profiles')
          .select('username, avatar_color, runner_escapes, hitter_clean_sweeps, total_whacks')
          .order('runner_escapes', { ascending: false })
          .limit(limit);

        if (profError) return [];
        return profData || [];
      }
      return data || [];
    } catch (err) {
      console.warn('Error fetching leaderboard:', err);
      return [];
    }
  }

  // Record a finished match in Supabase
  async recordMatch(matchData) {
    if (!this.client) return;
    try {
      const { error } = await this.client
        .from('match_history')
        .insert([{
          room_code: matchData.roomCode || 'LOBBY-1',
          hitter_username: matchData.hitterName || 'The Hitter',
          winner: matchData.winner, // 'RUNNERS' or 'HITTER'
          round_duration_seconds: matchData.duration || 120,
          runners_knocked_out: matchData.knockedOutCount || 0,
          total_runners: matchData.totalRunners || 1
        }]);

      if (error) console.warn('Could not save match history:', error.message);
    } catch (err) {
      console.warn('Match record error:', err);
    }
  }

  // Helper to get public URL of 3D models in Supabase Storage
  get3DModelUrl(fileName) {
    if (!this.client) return null;
    const { data } = this.client.storage.from('game-assets').getPublicUrl(fileName);
    return data?.publicUrl || null;
  }
}

export const supabaseService = new SupabaseService();
