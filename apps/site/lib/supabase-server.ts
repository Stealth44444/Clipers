import { createSupabaseClient } from '@clipers/db';

let client: ReturnType<typeof createSupabaseClient> | undefined;

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase URL과 anon key가 필요합니다.');
  }
  client ??= createSupabaseClient(url, anonKey);
  return client;
}
