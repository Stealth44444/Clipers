// What a notification says. Rows in public.notifications keep only a kind and its values (written by database
// triggers); the app and the notification emails both render the words here, so wording changes need no migration.
import { MIN_WITHDRAWAL } from './pricing';

export type NotificationData = Record<string, unknown>;
export type RenderedNotification = { title: string; body: string };

const won = (value: unknown) => `${Math.floor(Number(value) || 0).toLocaleString('ko-KR')}원`;
const text = (value: unknown, fallback = '') => (typeof value === 'string' && value.trim() ? value.trim() : fallback);
const CONNECTED_PLATFORMS: Record<string, string> = { tiktok: '틱톡', instagram_reels: '인스타그램' };

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
  topup_confirmed: (d) => ({
    title: d.reopened ? '예산을 늘려 캠페인을 다시 열었어요' : '예산을 늘렸어요',
    body: `${text(d.campaign_title, '캠페인')}: 입금을 확인해 예산에 ${won(d.amount)}을 더했어요.`,
  }),
  topup_short: (d) => ({
    title: '증액 입금액이 모자라요',
    body: `${text(d.campaign_title, '캠페인')}: ${won(d.received)}이 확인됐어요. 차액 ${won(d.difference)}을 더 입금해 주세요.`,
  }),
  refund_paid: (d) =>
    d.refund_kind === 'over_deposit'
      ? { title: '초과 입금을 돌려드렸어요', body: `${won(d.amount)}을 입금한 계좌로 보냈어요.` }
      : { title: '남은 금액을 보냈어요', body: `${won(d.amount)}을 요청한 계좌로 보냈어요.` },
  connection_expired: (d) => ({
    title: '계정 연결이 끊겼어요',
    body: `${CONNECTED_PLATFORMS[String(d.platform)] ?? '계정'} 연결이 만료됐어요. 설정의 '내 채널'에서 다시 연결해야 조회수를 계속 가져올 수 있어요.`,
  }),
};

export function renderNotification(kind: string, data: NotificationData): RenderedNotification {
  return RENDER[kind]?.(data ?? {}) ?? { title: '새 알림이 있어요', body: '' };
}

/**
 * Money notifications are always emailed; the rest can be turned off in settings (profiles.email_activity_notifications).
 * The database applies the same list when it writes a notification: keep both in step (notification_email_preferences migration).
 */
export const MONEY_NOTIFICATION_KINDS = [
  'settlement_created',
  'payout_paid',
  'refund_paid',
  'deposit_short',
  'topup_confirmed',
  'topup_short',
  'leftover_finalized',
  'campaign_live',
  'campaign_exhausted',
] as const;

export const isMoneyNotification = (kind: string) => (MONEY_NOTIFICATION_KINDS as readonly string[]).includes(kind);

type EmailDetails = { action: string; amount?: { label: string; value: string } };

const OPEN_CAMPAIGN = '캠페인 보기';
const OPEN_SUBMISSIONS = '제출 현황 보기';
const OPEN_EARNINGS = '수익 보기';
const OPEN_SPEND = '예산 사용 내역 보기';

// What the email adds to the in-app wording: the button label, and the amount shown on its own for money notifications.
const EMAIL_DETAILS: Record<string, (data: NotificationData) => EmailDetails> = {
  application_approved: () => ({ action: OPEN_CAMPAIGN }),
  application_rejected: () => ({ action: OPEN_CAMPAIGN }),
  clip_approved: () => ({ action: OPEN_SUBMISSIONS }),
  clip_rejected: () => ({ action: OPEN_SUBMISSIONS }),
  dispute_resolved: () => ({ action: OPEN_SUBMISSIONS }),
  view_report_reviewed: () => ({ action: OPEN_SUBMISSIONS }),
  settlement_created: (d) => ({ action: OPEN_EARNINGS, amount: { label: '정산 금액', value: won(d.amount) } }),
  payout_paid: (d) => ({ action: OPEN_EARNINGS, amount: { label: '보낸 금액', value: won(d.net_amount) } }),
  campaign_closed: () => ({ action: OPEN_CAMPAIGN }),
  campaign_live: () => ({ action: OPEN_CAMPAIGN }),
  deposit_short: (d) => ({ action: OPEN_CAMPAIGN, amount: { label: '더 입금할 금액', value: won(d.difference) } }),
  first_clip_approved: () => ({ action: OPEN_CAMPAIGN }),
  campaign_exhausted: () => ({ action: OPEN_CAMPAIGN }),
  leftover_finalized: (d) => ({ action: OPEN_SPEND, amount: { label: '잔액으로 옮긴 금액', value: won(d.amount) } }),
  topup_confirmed: (d) => ({ action: OPEN_CAMPAIGN, amount: { label: '늘어난 예산', value: won(d.amount) } }),
  topup_short: (d) => ({ action: OPEN_CAMPAIGN, amount: { label: '더 입금할 금액', value: won(d.difference) } }),
  refund_paid: (d) => ({ action: OPEN_SPEND, amount: { label: '보낸 금액', value: won(d.amount) } }),
  connection_expired: () => ({ action: '다시 연결하기' }),
};

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT = "-apple-system,BlinkMacSystemFont,'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif";

// Mail clients that honour prefers-color-scheme (Apple Mail, iOS Mail, Outlook for Mac) get the dark version;
// Gmail ignores it and applies its own inversion, which the light layout survives.
const DARK_MODE_STYLE = `<style>
.dark-logo{display:none}
@media (prefers-color-scheme:dark){
.page{background:#000000!important}
.card{background:#1c1c1e!important}
.ink{color:#f5f5f7!important}
.muted{color:#a1a1a6!important}
.amount{background:#2c2c2e!important}
.light-logo{display:none!important}
.dark-logo{display:inline-block!important}
}
</style>`;

/** A transactional email for one notification: logo, the in-app wording, the amount on its own, and a button to the page. */
export function buildNotificationEmail(notification: { kind: string; data: NotificationData; link: string | null }, appUrl: string) {
  const { title, body } = renderNotification(notification.kind, notification.data);
  const details = EMAIL_DETAILS[notification.kind]?.(notification.data ?? {}) ?? { action: 'Clipers에서 보기' };
  const url = new URL(notification.link ?? '/', appUrl).toString();
  const settingsUrl = new URL(notification.link?.startsWith('/brand') ? '/brand/settings' : '/creator/settings', appUrl).toString();
  const logo = (file: string) => new URL(`/logo/${file}`, appUrl).toString();
  const money = isMoneyNotification(notification.kind);

  const footerText = money
    ? '정산·입금처럼 돈과 관련된 알림이라 메일 설정과 관계없이 보내 드려요.'
    : `Clipers 계정 활동을 알려 드리는 메일이에요. 활동 알림 메일은 알림 설정에서 끌 수 있어요: ${settingsUrl}`;
  const text = [title, body, details.amount && `${details.amount.label}: ${details.amount.value}`, `${details.action}: ${url}`, footerText]
    .filter(Boolean)
    .join('\n\n');

  const footerHtml = money
    ? '정산·입금처럼 돈과 관련된 알림이라 메일 설정과 관계없이 보내 드려요.'
    : `Clipers 계정 활동을 알려 드리는 메일이에요. 활동 알림 메일은 <a href="${escapeHtml(settingsUrl)}" class="muted" style="color:#8e8e93;text-decoration:underline">알림 설정</a>에서 끌 수 있어요.`;
  const amountHtml = details.amount
    ? `<tr><td class="amount" style="padding:16px 20px;border-radius:12px;background:#f5f5f7">
<p class="muted" style="margin:0 0 4px;font-size:13px;line-height:1.4;color:#6e6e73">${escapeHtml(details.amount.label)}</p>
<p class="ink" style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#1d1d1f">${escapeHtml(details.amount.value)}</p>
</td></tr>
<tr><td style="height:24px;line-height:24px;font-size:0">&nbsp;</td></tr>`
    : '';
  // Hidden preview line for the inbox list; the trailing spacers stop clients from pulling in the text after it.
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(body || title)}${'&#8204;&nbsp;'.repeat(40)}</div>`;

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(title)}</title>${DARK_MODE_STYLE}</head>
<body class="page" style="margin:0;padding:0;background:#f5f5f7;font-family:${FONT}">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="page" style="background:#f5f5f7"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
<tr><td style="padding:0 4px 20px">
<img src="${escapeHtml(logo('clipers-wordmark-email.png'))}" width="96" height="35" alt="Clipers" class="light-logo" style="display:inline-block;border:0;height:35px;width:96px">
<img src="${escapeHtml(logo('clipers-wordmark-email-dark.png'))}" width="96" height="35" alt="Clipers" class="dark-logo" style="display:none;border:0;height:35px;width:96px">
</td></tr>
<tr><td class="card" style="padding:32px 28px;border-radius:16px;background:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td>
<p class="ink" style="margin:0 0 8px;font-size:20px;line-height:1.4;font-weight:700;color:#1d1d1f">${escapeHtml(title)}</p>
${body ? `<p class="muted" style="margin:0;font-size:15px;line-height:1.6;color:#48484a">${escapeHtml(body)}</p>` : ''}
</td></tr>
<tr><td style="height:24px;line-height:24px;font-size:0">&nbsp;</td></tr>
${amountHtml}
<tr><td><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#58b982;color:#06140c;font-size:15px;font-weight:600;line-height:1.2;text-decoration:none">${escapeHtml(details.action)}</a></td></tr>
</table>
</td></tr>
<tr><td style="padding:20px 4px 0">
<p class="muted" style="margin:0;font-size:12px;line-height:1.6;color:#8e8e93">${footerHtml}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject: title, text, html };
}
