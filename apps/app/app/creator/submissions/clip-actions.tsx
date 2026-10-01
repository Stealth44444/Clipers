'use client';

import { useState } from 'react';
import { fileDispute, fileManualViewReport } from '@clipers/db';
import { Field, Input, Textarea } from '@clipers/ui';
import ActionDialog from '@/components/action-dialog';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export function DisputeDialog({ clipId, creatorId }: { clipId: string; creatorId: string }) {
  const [reason, setReason] = useState('');
  return (
    <ActionDialog
      canSubmit={reason.trim().length > 0}
      onSubmit={() => fileDispute(getSupabaseBrowserClient(), clipId, creatorId, reason)}
      submitLabel="이의제기 보내기"
      title="이의제기"
      trigger="이의제기"
    >
      <Field count={reason.length} htmlFor={`dispute-${clipId}`} label="사유" maxLength={500}>
        <Textarea
          id={`dispute-${clipId}`}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="검수 결과에 동의하지 않는 이유를 적어 주세요. 운영팀이 다시 확인해요."
          value={reason}
        />
      </Field>
    </ActionDialog>
  );
}

export function ViewReportDialog({ clipId, creatorId }: { clipId: string; creatorId: string }) {
  const [viewCount, setViewCount] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  return (
    <ActionDialog
      canSubmit={Number(viewCount) > 0 && evidenceUrl.trim().length > 0}
      onSubmit={() => fileManualViewReport(getSupabaseBrowserClient(), clipId, creatorId, Number(viewCount), evidenceUrl)}
      submitLabel="신고하기"
      title="조회수 신고"
      trigger="조회수 신고"
    >
      <p className="cl-meta">
        조회수를 자동으로 가져올 수 없는 플랫폼이에요. 현재 조회수와 화면 캡처 링크를 보내 주시면 운영팀이 확인한 뒤 정산에 반영해요.
      </p>
      <Field htmlFor={`views-${clipId}`} label="현재 조회수">
        <Input
          id={`views-${clipId}`}
          inputMode="numeric"
          min={1}
          onChange={(event) => setViewCount(event.target.value)}
          type="number"
          value={viewCount}
        />
      </Field>
      <Field htmlFor={`evidence-${clipId}`} label="캡처 이미지 링크">
        <Input
          id={`evidence-${clipId}`}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          placeholder="https://"
          type="url"
          value={evidenceUrl}
        />
      </Field>
    </ActionDialog>
  );
}
