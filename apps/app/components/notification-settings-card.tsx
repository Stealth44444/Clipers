'use client';

import { useState } from 'react';
import { Bell, Wallet } from 'lucide-react';
import { Card, List, ListRow, Switch } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const ICON = { size: 18, strokeWidth: 1.8, 'aria-hidden': true } as const;

/** Email preference shared by brand and creator settings. In-app notifications always show; money emails always go out. */
export default function NotificationSettingsCard({ profileId, initialActivityEmails, moneyDescription }: {
  profileId: string;
  initialActivityEmails: boolean;
  moneyDescription: string;
}) {
  const [activityEmails, setActivityEmails] = useState(initialActivityEmails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: boolean) {
    setActivityEmails(next);
    setSaving(true);
    setError(false);
    const { error: updateError } = await getSupabaseBrowserClient()
      .from('profiles')
      .update({ email_activity_notifications: next })
      .eq('id', profileId);
    setSaving(false);
    if (updateError) {
      setActivityEmails(!next);
      setError(true);
    }
  }

  return (
    <Card description="앱 안의 알림은 설정과 관계없이 모두 보여요." id="notifications" title="알림 메일">
      <List>
        <ListRow
          description="지원·클립 검수 결과와 캠페인 소식을 메일로도 받아요."
          icon={<Bell {...ICON} />}
          title="활동 알림 메일"
          trailing={<Switch checked={activityEmails} disabled={saving} label="활동 알림 메일 받기" onChange={change} />}
        />
        <ListRow description={moneyDescription} icon={<Wallet {...ICON} />} title="돈 관련 알림 메일" trailing={<span className="cl-meta">항상 받음</span>} />
      </List>
      {error && (
        <p className="cl-alert cl-tone-tomato" role="alert">
          저장하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </Card>
  );
}
