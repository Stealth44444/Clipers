import { describe, it, expect, vi } from 'vitest';
import { buildEscalationSlackMessage, sendSlackNotification } from './slackNotifier';

describe('buildEscalationSlackMessage', () => {
  it('formats a single escalated clip', () => {
    const message = buildEscalationSlackMessage([
      {
        campaignTitle: '캠페인 A',
        creatorName: '크리에이터 1',
        url: 'https://example.com/clip1',
        slaDeadline: '2026-01-01T05:00:00.000Z',
      },
    ]);

    expect(message).toContain('SLA 초과 검수 요청 1건');
    expect(message).toContain('[캠페인 A] 크리에이터 1');
    expect(message).toContain('https://example.com/clip1');
    expect(message).toContain('2026-01-01 05:00');
  });

  it('formats multiple escalated clips as separate lines', () => {
    const message = buildEscalationSlackMessage([
      { campaignTitle: 'A', creatorName: 'C1', url: 'https://x/1', slaDeadline: '2026-01-01T00:00:00Z' },
      { campaignTitle: 'B', creatorName: 'C2', url: 'https://x/2', slaDeadline: '2026-01-02T00:00:00Z' },
    ]);

    expect(message).toContain('SLA 초과 검수 요청 2건');
    expect(message.split('\n')).toHaveLength(3);
  });
});

describe('sendSlackNotification', () => {
  it('returns ok when the webhook responds successfully', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const result = await sendSlackNotification('https://hooks.slack.example/x', 'hello', fetcher as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'https://hooks.slack.example/x',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns an error when the webhook responds with a non-2xx status', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const result = await sendSlackNotification('https://hooks.slack.example/x', 'hello', fetcher as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('SLACK_WEBHOOK_ERROR');
  });

  it('returns an error when the request throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await sendSlackNotification('https://hooks.slack.example/x', 'hello', fetcher as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('SLACK_REQUEST_FAILED');
  });
});
