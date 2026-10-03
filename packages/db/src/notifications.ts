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
  clip_unavailable: (d) => ({
    title: '클립 정산이 멈췄어요',
    body: `${text(d.campaign_title, '캠페인')}: 영상이 삭제되거나 비공개로 바뀐 것을 확인했어요. 다시 공개했다면 제출 현황에서 이의제기로 알려 주세요.`,
  }),
  clip_available_again: (d) => ({
    title: '클립 정산을 다시 시작해요',
    body: `${text(d.campaign_title, '캠페인')}: 영상이 다시 공개된 것을 확인했어요. 다음 정산부터 다시 포함돼요.`,
  }),
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
  // A clip's settlement stopping or resuming decides whether it is paid (2026-10-03 decision).
  'clip_unavailable',
  'clip_available_again',
] as const;

export const isMoneyNotification = (kind: string) => (MONEY_NOTIFICATION_KINDS as readonly string[]).includes(kind);

type DetailRow = { label: string; value: string };
type EmailDetails = { action: string; lead?: string; amount?: DetailRow; rows?: DetailRow[] };

/** Where people reach the team; notification emails set it as Reply-To and name it in the footer. */
export const SUPPORT_EMAIL = 'help@clipers.site';

const OPEN_CAMPAIGN = '캠페인 보기';
const OPEN_SUBMISSIONS = '제출 현황 보기';
const OPEN_EARNINGS = '수익 보기';
const OPEN_SPEND = '예산 사용 내역 보기';

const campaignRow = (d: NotificationData): DetailRow[] => (text(d.campaign_title) ? [{ label: '캠페인', value: text(d.campaign_title) }] : []);

// What the email shows beyond the in-app title: a lead sentence, the amount set apart for money notifications, the facts
// as label and value rows, and the button. Without a lead the in-app body is used.
const EMAIL_DETAILS: Record<string, (data: NotificationData) => EmailDetails> = {
  application_approved: (d) => ({ action: OPEN_CAMPAIGN, lead: '지원한 캠페인에 이제 클립을 제출할 수 있어요.', rows: campaignRow(d) }),
  application_rejected: (d) => ({ action: OPEN_CAMPAIGN, lead: '이번 캠페인 지원은 승인되지 않았어요. 다른 캠페인에도 지원해 보세요.', rows: campaignRow(d) }),
  clip_approved: (d) => ({ action: OPEN_SUBMISSIONS, lead: '검수를 통과했어요. 이제부터 이 클립의 조회수가 정산에 들어가요.', rows: campaignRow(d) }),
  clip_rejected: (d) => ({
    action: OPEN_SUBMISSIONS,
    lead: '검수에서 반려됐어요. 사유를 확인하고 다시 제출해 주세요.',
    rows: [...campaignRow(d), { label: '반려 사유', value: text(d.reason, '제출 현황에서 확인해 주세요.') }],
  }),
  dispute_resolved: (d) => ({
    action: OPEN_SUBMISSIONS,
    lead: '보내 주신 이의제기를 검토했어요.',
    rows: [...campaignRow(d), { label: '처리 결과', value: text(d.note, '제출 현황에서 확인해 주세요.') }],
  }),
  view_report_reviewed: (d) => ({
    action: OPEN_SUBMISSIONS,
    lead: d.verified ? '신고한 조회수를 확인해 정산에 반영했어요.' : '신고한 조회수를 확인했지만 정산에 반영하지 않았어요.',
    rows: campaignRow(d),
  }),
  settlement_created: (d) => ({
    action: OPEN_EARNINGS,
    lead: `${won(MIN_WITHDRAWAL)}부터 지급을 요청할 수 있어요.`,
    amount: { label: '이번 주 정산 금액', value: won(d.amount) },
  }),
  payout_paid: (d) => ({ action: OPEN_EARNINGS, lead: '등록한 계좌로 보냈어요.', amount: { label: '보낸 금액', value: won(d.net_amount) } }),
  campaign_closed: (d) => ({ action: OPEN_CAMPAIGN, lead: '이 캠페인에는 더 이상 클립을 제출할 수 없어요.', rows: campaignRow(d) }),
  campaign_live: (d) => ({ action: OPEN_CAMPAIGN, lead: '입금을 확인해 캠페인을 크리에이터에게 공개했어요.', rows: campaignRow(d) }),
  deposit_short: (d) => ({
    action: OPEN_CAMPAIGN,
    lead: '확인된 입금이 예산보다 적어요. 차액을 더 입금하면 캠페인을 공개해요.',
    amount: { label: '더 입금할 금액', value: won(d.difference) },
    rows: [...campaignRow(d), { label: '확인된 입금', value: won(d.received) }],
  }),
  first_clip_approved: (d) => ({ action: OPEN_CAMPAIGN, lead: '검수를 통과한 첫 클립이 올라왔어요.', rows: campaignRow(d) }),
  campaign_exhausted: (d) => ({ action: OPEN_CAMPAIGN, lead: '예산을 모두 써서 캠페인이 종료됐어요.', rows: campaignRow(d) }),
  leftover_finalized: (d) => ({
    action: OPEN_SPEND,
    lead: '중단한 캠페인에서 남은 금액을 잔액으로 옮겼어요.',
    amount: { label: '잔액으로 옮긴 금액', value: won(d.amount) },
    rows: campaignRow(d),
  }),
  topup_confirmed: (d) => ({
    action: OPEN_CAMPAIGN,
    lead: d.reopened ? '입금을 확인해 예산을 늘리고 캠페인을 다시 열었어요.' : '입금을 확인해 예산을 늘렸어요.',
    amount: { label: '늘어난 예산', value: won(d.amount) },
    rows: campaignRow(d),
  }),
  topup_short: (d) => ({
    action: OPEN_CAMPAIGN,
    lead: '확인된 증액 입금이 요청한 금액보다 적어요. 차액을 더 입금해 주세요.',
    amount: { label: '더 입금할 금액', value: won(d.difference) },
    rows: [...campaignRow(d), { label: '확인된 입금', value: won(d.received) }],
  }),
  refund_paid: (d) => ({
    action: OPEN_SPEND,
    lead: d.refund_kind === 'over_deposit' ? '초과 입금한 금액을 입금한 계좌로 돌려드렸어요.' : '남은 금액을 요청한 계좌로 보냈어요.',
    amount: { label: '보낸 금액', value: won(d.amount) },
  }),
  clip_unavailable: (d) => ({
    action: OPEN_SUBMISSIONS,
    lead: '영상이 삭제되거나 비공개로 바뀐 것을 확인해 이 클립의 정산을 멈췄어요. 다시 공개했다면 제출 현황에서 이의제기로 알려 주세요.',
    rows: campaignRow(d),
  }),
  clip_available_again: (d) => ({
    action: OPEN_SUBMISSIONS,
    lead: '영상이 다시 공개된 것을 확인했어요. 다음 정산부터 이 클립이 다시 포함돼요.',
    rows: campaignRow(d),
  }),
  connection_expired: (d) => ({
    action: '다시 연결하기',
    lead: "연결이 만료돼 조회수를 가져오지 못하고 있어요. 설정의 '내 채널'에서 다시 연결해 주세요.",
    rows: [{ label: '플랫폼', value: CONNECTED_PLATFORMS[String(d.platform)] ?? '연결한 계정' }],
  }),
};

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT = "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard','Malgun Gothic',sans-serif";
// Geometric faces close to the wordmark where the reader has them.
const WORDMARK_FONT = "'Poppins','Avenir Next','Futura','Helvetica Neue',Arial,sans-serif";
const BRAND_GREEN = '#2f7d52';

// Apple Mail, iOS Mail and Outlook for Mac follow prefers-color-scheme. Gmail ignores it and inverts colours itself but
// never images, so the logo is the green mark as an image (readable on both) beside the name as text (which inverts).
const DARK_MODE_STYLE = `<style>
@media (prefers-color-scheme:dark){
.page{background:#000000!important}
.card{background:#1c1c1e!important;border-color:#2c2c2e!important}
.ink{color:#f5f5f7!important}
.soft{color:#c7c7cc!important}
.muted{color:#8e8e93!important}
.rule{border-color:#2c2c2e!important}
}
</style>`;

/** A transactional email for one notification: logo badge, title, the amount set apart, the facts, and a button to the page. */
export function buildNotificationEmail(notification: { kind: string; data: NotificationData; link: string | null }, appUrl: string) {
  const { title, body } = renderNotification(notification.kind, notification.data);
  const details = EMAIL_DETAILS[notification.kind]?.(notification.data ?? {}) ?? { action: 'Clipers에서 보기' };
  const lead = details.lead ?? body;
  const rows = details.rows ?? [];
  const url = new URL(notification.link ?? '/', appUrl).toString();
  const settingsUrl = new URL(notification.link?.startsWith('/brand') ? '/brand/settings' : '/creator/settings', appUrl).toString();
  const money = isMoneyNotification(notification.kind);
  const e = escapeHtml;

  const reason = money
    ? '돈과 관련된 알림이라 메일 설정과 관계없이 보내 드려요.'
    : 'Clipers 계정 활동을 알려 드리는 메일이에요. 활동 알림 메일은 알림 설정에서 끌 수 있어요.';
  const text = [
    title,
    details.amount && `${details.amount.label}: ${details.amount.value}`,
    lead,
    ...rows.map((row) => `${row.label}: ${row.value}`),
    `${details.action}: ${url}`,
    money ? reason : `${reason} ${settingsUrl}`,
    `궁금한 점은 이 메일에 답장하거나 ${SUPPORT_EMAIL}로 보내 주세요.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const amountHtml = details.amount
    ? `<p class="muted" style="margin:24px 0 4px;font-size:13px;line-height:1.4;color:#8e8e93">${e(details.amount.label)}</p>
<p class="ink" style="margin:0;font-size:34px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#111111">${e(details.amount.value)}</p>`
    : '';
  const leadHtml = lead
    ? `<p class="soft" style="margin:${details.amount ? '16px' : '10px'} 0 0;font-size:15px;line-height:1.65;color:#48484a">${e(lead)}</p>`
    : '';
  const rowsHtml = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:collapse">
${rows
  .map(
    (row) => `<tr><td class="rule muted" valign="top" style="width:88px;padding:14px 12px 14px 0;border-top:1px solid #ececf0;font-size:13px;line-height:1.55;color:#8e8e93">${e(row.label)}</td>
<td class="rule ink" valign="top" style="padding:14px 0;border-top:1px solid #ececf0;font-size:14px;line-height:1.55;font-weight:500;color:#1d1d1f">${e(row.value)}</td></tr>`
  )
  .join('\n')}
</table>`
    : '';
  const reasonHtml = money
    ? e(reason)
    : `Clipers 계정 활동을 알려 드리는 메일이에요. 활동 알림 메일은 <a href="${e(settingsUrl)}" class="muted" style="color:#8e8e93;text-decoration:underline">알림 설정</a>에서 끌 수 있어요.`;
  // Hidden preview line for the inbox list; the trailing spacers stop clients from pulling in the text after it.
  const preview = details.amount ? `${details.amount.label} ${details.amount.value} · ${lead}` : lead || title;
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(preview)}${'&#8204;&nbsp;'.repeat(40)}</div>`;

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${e(title)}</title>${DARK_MODE_STYLE}</head>
<body class="page" style="margin:0;padding:0;background:#f2f2f4;font-family:${FONT};-webkit-font-smoothing:antialiased">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="page" style="background:#f2f2f4"><tr><td align="center" style="padding:40px 16px 48px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 4px 24px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td valign="middle" style="padding-right:8px"><img src="${e(new URL('/logo/clipers-email-mark.png', appUrl).toString())}" width="25" height="28" alt="" style="display:block;border:0;width:25px;height:28px"></td>
<td valign="middle" class="ink" style="font-family:${WORDMARK_FONT};font-size:21px;line-height:28px;font-weight:700;letter-spacing:-0.02em;color:#111111">Clipers</td>
</tr></table></td></tr>
<tr><td class="card" style="padding:36px 32px 32px;border:1px solid #e6e6ea;border-radius:20px;background:#ffffff">
<p class="ink" style="margin:0;font-size:22px;line-height:1.4;font-weight:700;letter-spacing:-0.02em;color:#111111">${e(title)}</p>
${amountHtml}
${leadHtml}
${rowsHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px"><tr><td align="center" bgcolor="${BRAND_GREEN}" style="border-radius:12px;background:${BRAND_GREEN}">
<a href="${e(url)}" style="display:block;padding:15px 20px;font-size:15px;line-height:1.2;font-weight:600;color:#ffffff;text-decoration:none">${e(details.action)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 8px 0">
<p class="muted" style="margin:0;font-size:12px;line-height:1.7;color:#8e8e93">${reasonHtml}</p>
<p class="muted" style="margin:8px 0 0;font-size:12px;line-height:1.7;color:#8e8e93">궁금한 점은 이 메일에 답장하거나 <a href="mailto:${SUPPORT_EMAIL}" class="muted" style="color:#8e8e93;text-decoration:underline">${SUPPORT_EMAIL}</a>로 보내 주세요.</p>
<p class="muted" style="margin:12px 0 0;font-size:12px;line-height:1.7;color:#aeaeb2">Clipers · <a href="https://clipers.site" class="muted" style="color:#aeaeb2;text-decoration:none">clipers.site</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject: title, text, html };
}
