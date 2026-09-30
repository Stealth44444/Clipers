import { describe, it, expect } from 'vitest';
import { createSupabaseClient } from './client';

describe('createSupabaseClient', () => {
  it('throws when url or anon key is missing', () => {
    expect(() => createSupabaseClient('', '')).toThrow(
      'Supabase URL과 anon key가 모두 필요합니다.'
    );
  });

  it('creates a client when both values are provided', () => {
    const client = createSupabaseClient('https://example.supabase.co', 'anon-key');
    expect(client).toBeDefined();
  });
});
