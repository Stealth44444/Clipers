import { describe, expect, it } from 'vitest';
import { buildNotificationEmail, renderNotification } from './notifications';

describe('renderNotification', () => {
  it('writes creator notifications with the campaign and amounts', () => {
    expect(renderNotification('application_approved', { campaign_title: '봄 캠페인' })).toEqual({
      title: '지원이 승인됐어요',
      body: '봄 캠페인에 클립을 제출할 수 있어요.',
    });
    expect(renderNotification('clip_rejected', { campaign_title: '봄 캠페인', reason: '요구사항과 달라요' }).body).toBe('봄 캠페인: 요구사항과 달라요');
    expect(renderNotification('settlement_created', { amount: 12345.6 }).body).toBe('12,345원이 정산됐어요. 3,000원부터 지급을 요청할 수 있어요.');
    expect(renderNotification('payout_paid', { net_amount: 96700 }).body).toBe('96,700원을 등록한 계좌로 보냈어요.');
  });

  it('tells a creator whether a view report counted', () => {
    expect(renderNotification('view_report_reviewed', { campaign_title: 'A', verified: true }).title).toBe('조회수 신고가 반영됐어요');
    expect(renderNotification('view_report_reviewed', { campaign_title: 'A', verified: false }).title).toBe('조회수 신고가 반영되지 않았어요');
  });

  it('writes brand notifications', () => {
    expect(renderNotification('deposit_short', { campaign_title: 'B', received: 500000, difference: 600000 }).body).toBe(
      'B: 500,000원이 확인됐어요. 차액 600,000원을 더 입금해 주세요.'
    );
    expect(renderNotification('leftover_finalized', { campaign_title: 'B', amount: 700000 }).body).toBe('B에서 남은 700,000원을 잔액으로 옮겼어요.');
    expect(renderNotification('refund_paid', { refund_kind: 'leftover', amount: 330000 }).title).toBe('남은 금액을 보냈어요');
    expect(renderNotification('refund_paid', { refund_kind: 'over_deposit', amount: 50000 }).title).toBe('초과 입금을 돌려드렸어요');
  });

  it('falls back to a plain message for an unknown kind or missing values', () => {
    expect(renderNotification('something_new', {})).toEqual({ title: '새 알림이 있어요', body: '' });
    expect(renderNotification('clip_approved', {}).body).toBe('캠페인 클립의 조회수가 정산에 들어가요.');
  });
});

describe('buildNotificationEmail', () => {
  it('uses the title as the subject and links into the app', () => {
    const email = buildNotificationEmail({ title: '지원이 승인됐어요', body: '바로 시작하세요 <b>', link: '/creator/campaigns' }, 'https://app.clipers.site/');
    expect(email.subject).toBe('지원이 승인됐어요');
    expect(email.text).toContain('https://app.clipers.site/creator/campaigns');
    expect(email.html).toContain('href="https://app.clipers.site/creator/campaigns"');
    expect(email.html).toContain('바로 시작하세요 &lt;b&gt;');
  });
});
