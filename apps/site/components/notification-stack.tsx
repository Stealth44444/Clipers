'use client';

import { useEffect, useRef, useState } from 'react';

// macOS-style grouped notifications from the Clipers app: a new one drops in on top and the earlier ones
// tuck in behind it, the way Notification Center stacks a group. Illustrative content.

const NOTICES = [
  { title: '정산 시작', body: '‘여름밤 후렴 챌린지’ 영상이 조회수 1,000회를 넘었어요. 이제부터 정산돼요.' },
  { title: '조회수 집계', body: '검증 조회수 48,200회 · 오늘 3,120회 늘었어요.' },
  { title: '주간 정산', body: '9월 29일 주 정산 26,160원이 쌓였어요.' },
  { title: '지급 완료', body: '요청한 38,560원을 보냈어요. 등록한 계좌를 확인해 보세요.' },
];

const STEP_MS = 2800;
const VISIBLE = 3;

export default function NotificationStack() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [head, setHead] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setHead((value) => value + 1), STEP_MS);
    });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  // Newest first: position 0 is the front card, higher positions tuck in behind.
  return (
    <div aria-hidden className="cl-notices" ref={rootRef}>
      {NOTICES.map((notice, index) => {
        const position = (head - index + NOTICES.length * 100) % NOTICES.length;
        return (
          <div className="cl-notice" data-position={position < VISIBLE ? position : 'out'} key={notice.title}>
            <img alt="" className="cl-notice__icon" src="/logo/clipers-mark.svg" />
            <div className="cl-notice__text">
              <p className="cl-notice__head">
                <strong>{notice.title}</strong>
                <span>{position === 0 ? '지금' : `${position * 2}분 전`}</span>
              </p>
              <p className="cl-notice__body">{notice.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
