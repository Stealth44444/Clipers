'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { extractYouTubeVideoId, platformLabels } from '@clipers/db';
import type { CampaignCard, TopClip } from './page';

function formatRate(card: CampaignCard): string {
  if (!card.rate_range) return '요율 미정';
  const { min, max } = card.rate_range;
  return min === max
    ? `₩${min.toLocaleString('ko-KR')} / 1,000뷰`
    : `₩${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')} / 1,000뷰`;
}

export function DiscoverGrid({ campaigns, topClips }: { campaigns: CampaignCard[]; topClips: TopClip[] }) {
  const [keyword, setKeyword] = useState('');
  const heroCampaigns = useMemo(
    () => [...campaigns].sort((left, right) => right.total_budget - left.total_budget).slice(0, 5),
    [campaigns]
  );
  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return campaigns;
    return campaigns.filter(
      (campaign) => campaign.title.toLowerCase().includes(query) || campaign.category.toLowerCase().includes(query)
    );
  }, [campaigns, keyword]);

  return (
    <>
      {heroCampaigns.length > 0 && (
        <section className="app-section" aria-labelledby="hero-title">
          <h2 id="hero-title" className="app-muted" style={{ fontSize: 12, textTransform: 'uppercase' }}>Featured</h2>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
            {heroCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                style={{ flex: '0 0 360px', display: 'block', borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }}
              >
                <div
                  style={{
                    height: 160,
                    background: campaign.cover_image_url ? `url(${campaign.cover_image_url}) center/cover` : '#222',
                  }}
                />
                <div style={{ padding: 16 }}>
                  <p className="app-muted">{campaign.brand_name}</p>
                  <h3 style={{ margin: '4px 0' }}>{campaign.title}</h3>
                  <p className="app-muted">{campaign.category} · {formatRate(campaign)} · {campaign.total_budget.toLocaleString('ko-KR')}원</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="app-section" aria-labelledby="search-title">
        <h2 id="search-title">캠페인 검색</h2>
        <input
          aria-label="캠페인 검색"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="예: 게임 캠페인 보여줘"
          style={{ width: '100%', maxWidth: 480, boxSizing: 'border-box', padding: '11px 12px', borderRadius: 6, border: '1px solid #454545', background: '#181818', color: '#fff' }}
          value={keyword}
        />
      </section>

      <section className="app-section" aria-labelledby="grid-title">
        <h2 id="grid-title">Campaigns for you <span className="app-muted">{filtered.length}</span></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              style={{ display: 'block', borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }}
            >
              <div
                style={{
                  height: 140,
                  background: campaign.cover_image_url ? `url(${campaign.cover_image_url}) center/cover` : '#222',
                }}
              />
              <div style={{ padding: 14 }}>
                <p className="app-muted">{campaign.brand_name}</p>
                <h3 style={{ margin: '4px 0', fontSize: 16 }}>{campaign.title}</h3>
                <p className="app-muted">{platformLabels(campaign.allowed_platforms)}</p>
                <p className="app-muted">{formatRate(campaign)}</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="app-muted">조건에 맞는 캠페인이 없습니다.</p>}
        </div>
      </section>

      {topClips.length > 0 && (
        <section className="app-section" aria-labelledby="top-clips-title">
          <h2 id="top-clips-title">Top clips</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {topClips.map((clip) => {
              const videoId = extractYouTubeVideoId(clip.url);
              return (
                <a key={clip.id} href={clip.url} rel="noreferrer" target="_blank" style={{ flex: '0 0 160px' }}>
                  <div
                    style={{
                      height: 260,
                      borderRadius: 8,
                      background: videoId ? `url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg) center/cover` : '#222',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 8,
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                      {clip.viewCount.toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <p className="app-muted" style={{ fontSize: 12, marginTop: 4 }}>{clip.campaignTitle}</p>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
