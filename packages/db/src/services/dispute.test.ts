import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fileDispute, resolveDispute } from './dispute';

function createFakeSupabase(result: { data: unknown; error: { message: string } | null }) {
  return {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => result,
        }),
      }),
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

describe('fileDispute', () => {
  it('rejects when reason is empty', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: null });
    const result = await fileDispute(fakeSupabase, 'clip-1', 'creator-1', '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('dispute_reason_required');
    }
  });

  it('rejects when reason is only whitespace', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: null });
    const result = await fileDispute(fakeSupabase, 'clip-1', 'creator-1', '   ');
    expect(result.ok).toBe(false);
  });

  it('inserts a dispute when reason is provided', async () => {
    const fakeSupabase = createFakeSupabase({ data: { id: 'dispute-1' }, error: null });
    const result = await fileDispute(fakeSupabase, 'clip-1', 'creator-1', '조회수가 이상합니다');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('dispute-1');
    }
  });

  it('returns a db_error when supabase returns an error', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: { message: 'not found' } });
    const result = await fileDispute(fakeSupabase, 'clip-1', 'creator-1', '사유');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('db_error');
    }
  });
});

describe('resolveDispute', () => {
  it('rejects when resolution note is empty', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: null });
    const result = await resolveDispute(fakeSupabase, 'dispute-1', '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('resolution_note_required');
    }
  });

  it('updates dispute status when resolution note is provided', async () => {
    const fakeSupabase = createFakeSupabase({ data: { id: 'dispute-1' }, error: null });
    const result = await resolveDispute(fakeSupabase, 'dispute-1', '재검토 결과 정상 트래픽 확인');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('dispute-1');
    }
  });

  it('returns a db_error when supabase returns an error', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: { message: 'not found' } });
    const result = await resolveDispute(fakeSupabase, 'dispute-1', '사유');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('db_error');
    }
  });
});
