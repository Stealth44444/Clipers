import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fileManualViewReport, reviewManualViewReport } from './manualViewReport';

function createFakeSupabaseForFiling(result: { data: unknown; error: { message: string } | null }) {
  return {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => result,
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

function createFakeSupabaseForReview(options: {
  updateResult: { data: unknown; error: { message: string } | null };
  insertResult?: { data: unknown; error: { message: string } | null };
}) {
  return {
    from: (table: string) => {
      if (table === 'manual_view_reports') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => options.updateResult,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'view_snapshots') {
        return {
          insert: async () => options.insertResult ?? { data: null, error: null },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
}

describe('fileManualViewReport', () => {
  it('rejects a negative or non-integer view count', async () => {
    const fakeSupabase = createFakeSupabaseForFiling({ data: null, error: null });
    const result = await fileManualViewReport(fakeSupabase, 'clip-1', 'creator-1', -5, 'https://example.com/proof.png');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_view_count');
  });

  it('rejects a missing evidence url', async () => {
    const fakeSupabase = createFakeSupabaseForFiling({ data: null, error: null });
    const result = await fileManualViewReport(fakeSupabase, 'clip-1', 'creator-1', 1000, '');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('evidence_required');
  });

  it('inserts a pending report when inputs are valid', async () => {
    const fakeSupabase = createFakeSupabaseForFiling({ data: { id: 'report-1' }, error: null });
    const result = await fileManualViewReport(fakeSupabase, 'clip-1', 'creator-1', 1000, 'https://example.com/proof.png');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe('report-1');
  });

  it('returns a db_error when supabase returns an error', async () => {
    const fakeSupabase = createFakeSupabaseForFiling({ data: null, error: { message: 'boom' } });
    const result = await fileManualViewReport(fakeSupabase, 'clip-1', 'creator-1', 1000, 'https://example.com/proof.png');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('db_error');
  });
});

describe('reviewManualViewReport', () => {
  it('inserts a manual view snapshot when verified', async () => {
    const fakeSupabase = createFakeSupabaseForReview({
      updateResult: { data: { id: 'report-1', clip_id: 'clip-1', reported_view_count: 12345 }, error: null },
      insertResult: { data: null, error: null },
    });
    const result = await reviewManualViewReport(fakeSupabase, 'report-1', 'admin-1', 'verified');
    expect(result.ok).toBe(true);
  });

  it('does not insert a view snapshot when rejected', async () => {
    let insertCalled = false;
    const fakeSupabase = {
      from: (table: string) => {
        if (table === 'manual_view_reports') {
          return {
            update: () => ({
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    single: async () => ({
                      data: { id: 'report-1', clip_id: 'clip-1', reported_view_count: 12345 },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'view_snapshots') {
          insertCalled = true;
          return { insert: async () => ({ data: null, error: null }) };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;

    const result = await reviewManualViewReport(fakeSupabase, 'report-1', 'admin-1', 'rejected');
    expect(result.ok).toBe(true);
    expect(insertCalled).toBe(false);
  });

  it('returns a db_error when the report is already processed', async () => {
    const fakeSupabase = createFakeSupabaseForReview({
      updateResult: { data: null, error: { message: 'no rows updated' } },
    });
    const result = await reviewManualViewReport(fakeSupabase, 'report-1', 'admin-1', 'verified');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('db_error');
  });

  it('returns a db_error when the snapshot insert fails', async () => {
    const fakeSupabase = createFakeSupabaseForReview({
      updateResult: { data: { id: 'report-1', clip_id: 'clip-1', reported_view_count: 12345 }, error: null },
      insertResult: { data: null, error: { message: 'insert failed' } },
    });
    const result = await reviewManualViewReport(fakeSupabase, 'report-1', 'admin-1', 'verified');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('db_error');
  });
});
