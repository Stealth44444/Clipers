// What a notification says. Rows in public.notifications keep only a kind and its values (written by database
// triggers); the app and the notification emails both render the words here, so wording changes need no migration.
import { MIN_WITHDRAWAL } from './pricing';

export type NotificationData = Record<string, unknown>;
export type RenderedNotification = { title: string; body: string };

const won = (value: unknown) => `${Math.floor(Number(value) || 0).toLocaleString('ko-KR')}원`;
const text = (value: unknown, fallback = '') => (typeof value === 'string' && value.trim() ? value.trim() : fallback);

const RENDER: Record<string, (data: NotificationData) => RenderedNotification> = {
  application_approved: (d) => ({ title: '지원이 승인됐어요', body: `${text(d.campaign_title, '지원한 캠페인')}에 클립을 제출할 수 있어요.` }),
  application_rejected: (d) => ({ title: '지원이 반려됐어요', body: `${text(d.campaign_title, '캠페인')} 지원이 승인되지 않았어요.` }),
  clip_approved: (d) => ({ title: '클립이 승인됐어요', body: `${text(d.campaign_title, '캠페인')} 클립의 조회수가 정산에 들어가요.` }),
  clip_rejected: (d) => ({ title: '클립이 반려됐어요', body: `${text(d.campaign_title, '캠페인')}: ${text(d.reason, '사유를 확인해 주세요.')}` }),
  settlement_created: (d) => ({
    title: '이번 주 정산이 나왔어요',
    body: `${won(d.amount)}이 정산됐어요. ${won(MIN_WITHDRAWAL)}부터 지급을 요청할 수 있어요.`,
  }),
  payout_paid: (d) => ({ title: '지급했어요', body: `${won(d.net_amount)}을 등록한 계좌로 보냈어요.` }),
  dispute_resolved: (d) => ({ title: '이의제기를 처리했어요', body: `${text(d.campaign_title, '캠페인')}: ${text(d.note, '처리 결과를 확인해 주세요.')}` }),
  view_report_reviewed: (d) => ({
    title: d.verified ? '조회수 신고가 반영됐어요' : '조회수 신고가 반영되지 않았어요',
    body: `${text(d.campaign_title, '캠페인')} 클립`,
  }),
  campaign_closed: (d) => ({ title: '캠페인이 종료됐어요', body: `${text(d.campaign_title, '참여한 캠페인')}에는 더 이상 클립을 제출할 수 없어요.` }),
  campaign_live: (d) => ({ title: '캠페인이 공개됐어요', body: `${text(d.campaign_title, '캠페인')}: 입금을 확인해 크리에이터에게 공개했어요.` }),
  deposit_short: (d) => ({
    title: '입금액이 모자라요',
    body: `${text(d.campaign_title, '캠페인')}: ${won(d.received)}이 확인됐어요. 차액 ${won(d.difference)}을 더 입금해 주세요.`,
  }),
  first_clip_approved: (d) => ({ title: '첫 클립이 승인됐어요', body: `${text(d.campaign_title, '캠페인')}에 첫 클립이 올라왔어요.` }),
  campaign_exhausted: (d) => ({ title: '예산을 모두 썼어요', body: `${text(d.campaign_title, '캠페인')}: 예산을 모두 써서 종료됐어요.` }),
  leftover_finalized: (d) => ({ title: '남은 금액이 잔액이 됐어요', body: `${text(d.campaign_title, '중단한 캠페인')}에서 남은 ${won(d.amount)}을 잔액으로 옮겼어요.` }),
  refund_paid: (d) =>
    d.refund_kind === 'over_deposit'
      ? { title: '초과 입금을 돌려드렸어요', body: `${won(d.amount)}을 입금한 계좌로 보냈어요.` }
      : { title: '남은 금액을 보냈어요', body: `${won(d.amount)}을 요청한 계좌로 보냈어요.` },
};

export function renderNotification(kind: string, data: NotificationData): RenderedNotification {
  return RENDER[kind]?.(data ?? {}) ?? { title: '새 알림이 있어요', body: '' };
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A short transactional email for one notification, linking to the page it is about. */
export function buildNotificationEmail(notification: RenderedNotification & { link: string | null }, appUrl: string) {
  const url = new URL(notification.link ?? '/', appUrl).toString();
  const subject = notification.title;
  const text = `${notification.title}\n\n${notification.body}\n\n${url}\n\nClipers 서비스 알림이에요.`;
  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:24px;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Pretendard','Apple SD Gothic Neo',sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<tr><td>
<p style="margin:0 0 8px;font-size:18px;font-weight:600">${escapeHtml(notification.title)}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#444">${escapeHtml(notification.body)}</p>
<a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:14px">Clipers에서 보기</a>
<p style="margin:24px 0 0;font-size:12px;color:#888">Clipers 서비스 알림이에요.</p>
</td></tr></table></body></html>`;
  return { subject, text, html };
}
