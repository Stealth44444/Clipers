'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button, Field, Input, Select, StatusDot } from '@clipers/ui';
import DemoCursor from '@/components/brand/demo-cursor';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { submitFrames } from '@/lib/brand-demos';

const FRAMES = submitFrames();
const noop = () => {};

/**
 * The creator app's clip-submit dialog over the clip being submitted. It uses the Dialog's markup and classes because
 * the real Dialog only opens as a modal; the fields and buttons inside are the real components.
 */
export default function ClipSubmitDemo() {
  const { ref, frame, moving } = useDemoFrame(FRAMES);
  const video = useRef<HTMLVideoElement>(null);
  const platformId = useId();
  const urlId = useId();

  useEffect(() => {
    if (moving) video.current?.play().catch(() => {});
  }, [moving]);

  return (
    <div className="cl-bdemo-submit" inert ref={ref}>
      <video className="cl-bdemo-submit__clip" loop muted playsInline poster="/media/clips/beauty.jpg" preload="metadata" ref={video} src="/media/clips/beauty.mp4" />
      <div className="cl-app-dark cl-dialog cl-bdemo-submit__dialog">
        <div className="cl-dialog__header">
          <p className="cl-dialog__title">여름밤 후렴 챌린지 · 클립 제출</p>
          <span className="cl-icon-button">
            <X size={18} />
          </span>
        </div>
        <div className="cl-dialog__body">
          <Field htmlFor={platformId} label="플랫폼">
            <Select data-demo="platform" id={platformId} onChange={noop} value={frame.platform ? 'youtube_shorts' : ''}>
              <option value="">플랫폼 선택</option>
              <option value="youtube_shorts">유튜브 쇼츠</option>
            </Select>
          </Field>
          <Field hint="공개 상태로 게시된 영상 링크를 붙여 넣어 주세요." htmlFor={urlId} label="영상 링크">
            <Input data-demo="url" id={urlId} placeholder="https://youtube.com/shorts/..." readOnly value={frame.url} />
          </Field>
        </div>
        <div className="cl-dialog__footer">
          <Button variant="secondary">취소</Button>
          <Button data-demo="submit" disabled={!frame.platform || !frame.url} variant="primary">
            {frame.sending ? '제출 중…' : '제출하기'}
          </Button>
        </div>
      </div>
      <p className="cl-app-dark cl-bdemo-toast" data-on={frame.sent}>
        <StatusDot pulse tone="yellow">
          제출했어요 · 검수 대기
        </StatusDot>
      </p>
      <DemoCursor click={frame.click} stage={ref} target={frame.cursor} />
    </div>
  );
}
