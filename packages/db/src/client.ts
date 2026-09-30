import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL과 anon key가 모두 필요합니다.');
  }
  return createClient(url, anonKey);
}
