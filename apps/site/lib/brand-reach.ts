// The brand page's reach section (spec: docs/superpowers/specs/2026-10-02-brand-reach-section-design.md §4).
// Three scenes: clips from many creators land at once on different platforms, three edits of one game take their
// chances, and the campaign's clip list shows which one won. Creators and views are examples; no amounts.

import { hitProbability } from './views-math';

export type ReachClip = {
  video: string;
  poster: string;
  platform: string;
  handle: string;
  caption: string;
  likes: string;
  comments: string;
  views: number;
  hit?: boolean;
};

export type Arrival = { creator: string; platform: string; ago: string };

/** Scene 1: new clips landing at once from different creators on different platforms, newest first. */
export const ARRIVALS: Arrival[] = [
  { creator: '하린', platform: 'instagram_reels', ago: '방금' },
  { creator: '도윤', platform: 'youtube_shorts', ago: '1분 전' },
  { creator: '서아', platform: 'tiktok', ago: '1분 전' },
  { creator: '민준', platform: 'naver_clip', ago: '3분 전' },
  { creator: '지우', platform: 'kakao_shorts', ago: '4분 전' },
];

/** Scene 2: one game, cut three ways by three creators — left, centre (in front), right. */
export const HOOP_CLIPS: ReachClip[] = [
  {
    video: '/media/clips/hoops-slow.mp4',
    poster: '/media/clips/hoops-slow.jpg',
    platform: 'youtube_shorts',
    handle: 'court.cuts',
    caption: '끝까지 보면 소름',
    likes: '612',
    comments: '38',
    views: 12_000,
  },
  {
    video: '/media/clips/hoops-close.mp4',
    poster: '/media/clips/hoops-close.jpg',
    platform: 'instagram_reels',
    handle: 'hoopclip',
    caption: '이게 들어간다고?',
    likes: '1.8만',
    comments: '402',
    views: 314_000,
    hit: true,
  },
  {
    video: '/media/clips/hoops-late.mp4',
    poster: '/media/clips/hoops-late.jpg',
    platform: 'tiktok',
    handle: 'buzzer.kr',
    caption: '경기 종료 3초 전',
    likes: '204',
    comments: '17',
    views: 8_400,
  },
];

export type RankedClip = { creator: string; title: string; platform: string; views: number };

/** Scene 3: the campaign's 받은 클립 list sorted by views, led by scene 2's winner. */
export const RANKED_CLIPS: RankedClip[] = [
  { creator: '하린', title: '이게 들어간다고?', platform: 'instagram_reels', views: 314_000 },
  { creator: '도윤', title: '끝까지 보면 소름', platform: 'youtube_shorts', views: 12_000 },
  { creator: '서아', title: '경기 종료 3초 전', platform: 'tiktok', views: 8_400 },
  { creator: '민준', title: '골밑 슬로모션 모음', platform: 'youtube_shorts', views: 5_100 },
  { creator: '지우', title: '오늘의 하이라이트', platform: 'tiktok', views: 3_900 },
];

/** Chance that one of 10 clips lands in the top 20%, in percent (89). */
export const HIT_PERCENT = Math.round(hitProbability(10) * 100);

/** Views as the apps write them: 48.2만 from ten thousand up, 8,400 below. */
export function compactViews(views: number): string {
  return views >= 10_000 ? `${(views / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만` : views.toLocaleString('ko-KR');
}
