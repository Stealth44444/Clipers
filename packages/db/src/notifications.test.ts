import { describe, expect, it } from 'vitest';
import { buildNotificationEmail, isMoneyNotification, renderNotification } from './notifications';

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
    expect(renderNotification('topup_confirmed', { campaign_title: 'B', amount: 300000, reopened: true })).toEqual({
      title: '예산을 늘려 캠페인을 다시 열었어요',
      body: 'B: 입금을 확인해 예산에 300,000원을 더했어요.',
    });
    expect(renderNotification('topup_confirmed', { campaign_title: 'B', amount: 300000, reopened: false }).title).toBe('예산을 늘렸어요');
    expect(renderNotification('topup_short', { campaign_title: 'B', received: 50000, difference: 60000 }).body).toBe(
      'B: 50,000원이 확인됐어요. 차액 60,000원을 더 입금해 주세요.'
    );
    expect(renderNotification('refund_paid', { refund_kind: 'over_deposit', amount: 50000 }).title).toBe('초과 입금을 돌려드렸어요');
  });

  it('falls back to a plain message for an unknown kind or missing values', () => {
    expect(renderNotification('something_new', {})).toEqual({ title: '새 알림이 있어요', body: '' });
    expect(renderNotification('clip_approved', {}).body).toBe('캠페인 클립의 조회수가 정산에 들어가요.');
  });
});

const appUrl = 'https://app.clipers.site/';

describe('buildNotificationEmail', () => {
  it('uses the title as the subject and links into the app with a button named for the page', () => {
    const email = buildNotificationEmail({ kind: 'clip_rejected', data: { campaign_title: '봄 <b>', reason: '화질' }, link: '/creator/submissions' }, appUrl);
    expect(email.subject).toBe('클립이 반려됐어요');
    expect(email.text).toContain('제출 현황 보기: https://app.clipers.site/creator/submissions');
    expect(email.html).toContain('href="https://app.clipers.site/creator/submissions"');
    expect(email.html).toContain('>제출 현황 보기</a>');
    expect(email.html).toContain('봄 &lt;b&gt;: 화질');
    expect(email.html).not.toContain('봄 <b>');
  });

  it('shows the logo from the app and a hidden preview line', () => {
    const email = buildNotificationEmail({ kind: 'application_approved', data: { campaign_title: '봄 캠페인' }, link: '/creator/campaigns' }, appUrl);
    expect(email.html).toContain('src="https://app.clipers.site/logo/clipers-wordmark-email.png"');
    expect(email.html).toContain('src="https://app.clipers.site/logo/clipers-wordmark-email-dark.png"');
    expect(email.html).toMatch(/<div style="display:none[^"]*">봄 캠페인에 클립을 제출할 수 있어요\./);
  });

  it('sets the amount apart for money notifications and says they are always sent', () => {
    const email = buildNotificationEmail({ kind: 'settlement_created', data: { amount: 128000 }, link: '/creator/earnings' }, appUrl);
    expect(email.html).toContain('>정산 금액</p>');
    expect(email.html).toContain('>128,000원</p>');
    expect(email.text).toContain('정산 금액: 128,000원');
    expect(email.html).toContain('메일 설정과 관계없이 보내 드려요');
    expect(email.html).not.toContain('/settings');
  });

  it('links activity notifications to the right settings page', () => {
    const creator = buildNotificationEmail({ kind: 'clip_approved', data: {}, link: '/creator/submissions' }, appUrl);
    expect(creator.html).toContain('href="https://app.clipers.site/creator/settings"');
    expect(creator.text).toContain('알림 설정에서 끌 수 있어요: https://app.clipers.site/creator/settings');
    expect(creator.html).not.toContain('정산 금액');

    const brand = buildNotificationEmail({ kind: 'first_clip_approved', data: { campaign_title: 'B' }, link: '/brand/campaigns/1' }, appUrl);
    expect(brand.html).toContain('href="https://app.clipers.site/brand/settings"');
  });

  it('falls back to a generic button for an unknown kind', () => {
    const email = buildNotificationEmail({ kind: 'something_new', data: {}, link: null }, appUrl);
    expect(email.subject).toBe('새 알림이 있어요');
    expect(email.html).toContain('href="https://app.clipers.site/"');
    expect(email.html).toContain('>Clipers에서 보기</a>');
  });
});

describe('money notifications', () => {
  it('are always emailed; activity notifications can be turned off', () => {
    expect(isMoneyNotification('settlement_created')).toBe(true);
    expect(isMoneyNotification('deposit_short')).toBe(true);
    expect(isMoneyNotification('clip_approved')).toBe(false);
    expect(isMoneyNotification('connection_expired')).toBe(false);
  });
});

describe('connection_expired', () => {
  it('names the platform and points to the channels card', () => {
    expect(renderNotification('connection_expired', { platform: 'tiktok' }).body).toBe(
      "틱톡 연결이 만료됐어요. 설정의 '내 채널'에서 다시 연결해야 조회수를 계속 가져올 수 있어요."
    );
    expect(renderNotification('connection_expired', { platform: 'instagram_reels' }).body.startsWith('인스타그램 연결이')).toBe(true);
    const email = buildNotificationEmail({ kind: 'connection_expired', data: { platform: 'tiktok' }, link: '/creator/settings#channels' }, appUrl);
    expect(email.html).toContain('href="https://app.clipers.site/creator/settings#channels"');
    expect(email.html).toContain('>다시 연결하기</a>');
  });
});
