export const SUPABASE_URL = 'https://ajqvbronozcyoftkjmja.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcXZicm9ub3pjeW9mdGtqbWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMjQ5MDksImV4cCI6MjEwNDYwMDkwOX0.wz55nh8IWrH-vZ7rDDQCeLpp7bjydGV8K6WJejdPZ6Q';

export class SupabaseService {
  constructor() {
    this.client = null;
    this.init();
  }

  async init() {
    try {
      // Dynamic import with safe fallback so it never blocks game start
      const module = await import('https://esm.sh/@supabase/supabase-js@2').catch(() => null);
      if (module && module.createClient) {
        this.client = module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        console.log('⚡ Supabase Connected!');
      }
    } catch (e) {
      console.warn('Supabase offline or optional:', e);
    }
  }

  async getLeaderboard(limit = 10) {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('leaderboard')
        .select('*')
        .limit(limit);

      if (error) {
        const { data: profData } = await this.client
          .from('profiles')
          .select('username, avatar_color, runner_escapes, hitter_clean_sweeps, total_whacks')
          .limit(limit);
        return profData || [];
      }
      return data || [];
    } catch (err) {
      return [];
    }
  }

  async recordMatch(matchData) {
    if (!this.client) return;
    try {
      await this.client
        .from('match_history')
        .insert([{
          room_code: matchData.roomCode || 'LOBBY-1',
          hitter_username: matchData.hitterName || 'The Hitter',
          winner: matchData.winner,
          round_duration_seconds: matchData.duration || 120,
          runners_knocked_out: matchData.knockedOutCount || 0,
          total_runners: matchData.totalRunners || 1
        }]);
    } catch (err) {}
  }

  get3DModelUrl(fileName) {
    if (!this.client) return null;
    try {
      const { data } = this.client.storage.from('game-assets').getPublicUrl(fileName);
      return data?.publicUrl || null;
    } catch (e) {
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();
