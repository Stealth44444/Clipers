import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from './supabase-server';

export type SessionProfile = {
  id: string;
  role: 'admin' | 'brand' | 'creator';
  display_name: string;
  interests: string[];
  on_camera: string | null;
  experience_level: string | null;
};

/** Signed-in user and profile, deduplicated per request. Middleware guarantees a session on workspace routes. */
export const getSession = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, display_name, interests, on_camera, experience_level')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');

  return { supabase, user, profile: profile as SessionProfile };
});
