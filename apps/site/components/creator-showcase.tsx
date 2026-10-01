'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar, PlatformIcon, StatusDot, buttonClass, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import MockCampaignCard, { MOCK_CAMPAIGNS } from '@/components/mock-campaign-card';
import type { MarketCampaign } from '@/lib/campaigns';

// Hero showcase for the creator landing (after contentrewards.com's Discover / Post / Earn):
// three tabs that advance on their own while in view, each showing one moment of the creator flow.

const TABS = [
  { id: 'discover', label: '탐색' },
  { id: 'post', label: '제출' },
  { id: 'earn', label: '정산' },
] as const;

const TAB_MS = 5200;
const TICK_MS = 50;
const SAMPLE_URL = 'https://youtube.com/shorts/x8Kd2Qm4';
const PLATFORMS = ['youtube_shorts', 'tiktok', 'instagram_reels', 'facebook', 'x', 'naver_clip', 'kakao_shorts'];
const EARNED = 38_560;

export default function CreatorShowcase({ campaigns }: { campaigns: MarketCampaign[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  const [elapsed, setElapsed] = useState(TAB_MS);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Reduced motion: no autoplay; every tab shows its finished state.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setElapsed(0);
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), { threshold: 0.4 });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setElapsed((current) => {
        if (current + TICK_MS < TAB_MS) return current + TICK_MS;
        setTab((index) => (index + 1) % TABS.length);
        return 0;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  const progress = Math.min(1, elapsed / TAB_MS);
  const current = TABS[tab].id;

  let panel: ReactNode;
  if (current === 'discover') {
    panel = (
      <div className="cl-showcase__cards">
        {campaigns.length >= 3
          ? campaigns.slice(0, 5).map((campaign) => (
              <div className="cl-showcase__card" inert key={campaign.id}>
                <CampaignCard campaign={campaign} />
              </div>
            ))
          : [...MOCK_CAMPAIGNS.music, ...MOCK_CAMPAIGNS.ugc].slice(0, 5).map((campaign) => (
              <div className="cl-showcase__card" key={campaign.title}>
                <MockCampaignCard campaign={campaign} />
              </div>
            ))}
      </div>
    );
  } else if (current === 'post') {
    const typed = SAMPLE_URL.slice(0, Math.round(SAMPLE_URL.length * Math.min(1, progress * 2.2)));
    const submitted = progress > 0.55;
    panel = (
      <div className="cl-showcase__sheet">
        <p className="cl-showcase__caption">영상 링크를 붙여 넣으면 제출 끝</p>
        <div className="cl-showcase__field">
          <span className="cl-showcase__url">{typed || <span className="cl-showcase__placeholder">https://youtube.com/shorts/…</span>}</span>
          <span
            className={buttonClass({
              variant: submitted ? 'secondary' : 'primary',
              size: 'md',
            })}
          >
            {submitted ? '제출됨' : '제출하기'}
          </span>
        </div>
        <p className="cl-showcase__status">
          {submitted ? (
            <StatusDot pulse tone="yellow">
              검수 대기 · 72시간 안에 확인해요
            </StatusDot>
          ) : (
            <span>&nbsp;</span>
          )}
        </p>
        <span className="cl-showcase__platforms">
          {PLATFORMS.map((platform) => (
            <PlatformIcon key={platform} platform={platform} size={20} />
          ))}
        </span>
      </div>
    );
  } else {
    const amount = Math.round(EARNED * Math.min(1, progress * 2.5));
    panel = (
      <div className="cl-showcase__receipt-wrap">
        <div className="cl-showcase__receipt">
          <p className="cl-showcase__caption">제출한 영상</p>
          <p className="cl-showcase__campaign">
            <Avatar name="여름밤 챌린지" size="sm" />
            신곡 &apos;여름밤&apos; 후렴 챌린지
          </p>
          <p className="cl-showcase__amount">{formatKRW(amount)}</p>
          <p className="cl-showcase__caption">조회수 48,200회 · 받을 금액</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cl-showcase" ref={rootRef}>
      <div aria-label="크리에이터 흐름" className="cl-showcase__tabs" role="tablist">
        {TABS.map((item, index) => (
          <button
            aria-selected={index === tab}
            className="cl-showcase__tab"
            key={item.id}
            onClick={() => {
              setTab(index);
              setElapsed(playing ? 0 : TAB_MS);
            }}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div aria-hidden className="cl-showcase__track">
        <span className="cl-showcase__fill" style={{ width: `${((tab + progress) / TABS.length) * 100}%` }} />
      </div>
      <div className="cl-showcase__stage" key={current} role="tabpanel">
        {panel}
      </div>
    </div>
  );
}
