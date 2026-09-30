import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rejectClip } from './rejectClip';

function createFakeSupabase(result: { data: unknown; error: { message: string } | null }) {
  return {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => result,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('rejectClip', () => {
  it('rejects when reason is empty', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: null });
    const result = await rejectClip(fakeSupabase, 'clip-1', '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('rejection_reason_required');
    }
  });

  it('rejects when reason is only whitespace', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: null });
    const result = await rejectClip(fakeSupabase, 'clip-1', '   ');
    expect(result.ok).toBe(false);
  });

  it('updates clip status when reason is provided', async () => {
    const fakeSupabase = createFakeSupabase({ data: { id: 'clip-1' }, error: null });
    const result = await rejectClip(fakeSupabase, 'clip-1', '워터마크가 없습니다');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('clip-1');
    }
  });

  it('returns a db_error when supabase returns an error', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: { message: 'not found' } });
    const result = await rejectClip(fakeSupabase, 'clip-1', '사유');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('db_error');
    }
  });
});
