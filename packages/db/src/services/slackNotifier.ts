import { err, ok, type ServiceResult } from './errors';

export type EscalatedClipSummary = {
  campaignTitle: string;
  creatorName: string;
  url: string;
  slaDeadline: Date | string;
};

export function buildEscalationSlackMessage(clips: EscalatedClipSummary[]): string {
  const lines = clips.map((clip) => {
    const deadline = new Date(clip.slaDeadline);
    const deadlineText = Number.isFinite(deadline.getTime())
      ? deadline.toISOString().replace('T', ' ').slice(0, 16)
      : String(clip.slaDeadline);
    return `• [${clip.campaignTitle}] ${clip.creatorName} — SLA 초과 (마감 ${deadlineText}) ${clip.url}`;
  });

  return `:rotating_light: SLA 초과 검수 요청 ${clips.length}건\n${lines.join('\n')}`;
}

export async function sendSlackNotification(
  webhookUrl: string,
  text: string,
  fetcher: typeof fetch = fetch
): Promise<ServiceResult<null>> {
  try {
    const response = await fetcher(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return err('SLACK_WEBHOOK_ERROR', `Slack webhook 요청이 HTTP ${response.status}로 실패했습니다.`);
    }

    return ok(null);
  } catch {
    return err('SLACK_REQUEST_FAILED', 'Slack webhook에 연결하지 못했습니다.');
  }
}
