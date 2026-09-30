import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rejectClip } from './rejectClip';

function createFakeSupabase(result: { data: unknown; error: { message: string } | null }) {
  const calls: { payload?: Record<string, unknown> } = {};
  const client = {
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        calls.payload = payload;
        return {
          eq: () => ({
            select: () => ({
              single: async () => result,
            }),
          }),
        };
      },
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('rejectClip', () => {
  it('rejects when reason is empty', async () => {
    const { client } = createFakeSupabase({ data: null, error: null });
    const result = await rejectClip(client, 'clip-1', '', 'admin-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('rejection_reason_required');
    }
  });

  it('rejects when reason is only whitespace', async () => {
    const { client } = createFakeSupabase({ data: null, error: null });
    const result = await rejectClip(client, 'clip-1', '   ', 'admin-1');
    expect(result.ok).toBe(false);
  });

  it('stores the trimmed reason and the reviewer when reason is provided', async () => {
    const { client, calls } = createFakeSupabase({ data: { id: 'clip-1' }, error: null });
    const result = await rejectClip(client, 'clip-1', '  워터마크가 없습니다  ', 'admin-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('clip-1');
    }
    expect(calls.payload).toMatchObject({
      status: 'rejected',
      rejection_reason: '워터마크가 없습니다',
      reviewed_by: 'admin-1',
    });
    expect(typeof calls.payload?.reviewed_at).toBe('string');
  });

  it('returns a db_error when supabase returns an error', async () => {
    const { client } = createFakeSupabase({ data: null, error: { message: 'not found' } });
    const result = await rejectClip(client, 'clip-1', '사유', 'admin-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('db_error');
    }
  });
});
