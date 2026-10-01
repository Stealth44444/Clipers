'use client';

import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { verifiedFrames } from '@/lib/brand-demos';

const FRAMES = verifiedFrames();

/** Verified views counting up in the verification flow's result panel (no money beside it). */
export default function VerifiedViews() {
  const { ref, frame } = useDemoFrame<number, HTMLElement>(FRAMES);
  return <strong ref={ref}>{frame.toLocaleString('ko-KR')}회</strong>;
}
