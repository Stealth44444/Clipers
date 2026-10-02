import type { GuideSource } from './types';

// Primary sources shared by the advertiser guides, each checked on the date below. Only official pages: a platform's
// own help center, a government page or a company's own announcement.

const checked = '2026-10-02';

export const SOURCES = {
  adDisclosure: {
    label: '찾기쉬운 생활법령정보 — 광고 표시, 어떻게 하면 문제가 없나요? (공정거래위원회 추천·보증 심사지침)',
    url: 'https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1575&ccfNo=2&cciNo=3&cnpClsNo=1',
    checked,
  },
  youtubeShorts: { label: 'YouTube 고객센터 — 3분 길이의 Shorts', url: 'https://support.google.com/youtube/answer/15424877?hl=ko', checked },
  youtubePaidPromotion: { label: 'YouTube 고객센터 — 유료 프로모션 공개', url: 'https://support.google.com/youtube/answer/154235?hl=ko', checked },
  tiktokDisclosure: {
    label: 'TikTok 도움말 — Commercial Content Disclosure 설정',
    url: 'https://ads.tiktok.com/resources/help/article/how-to-turn-on-the-commercial-content-disclosure-setting-in-tiktok',
    checked,
  },
  metaPaidPartnership: { label: 'Meta 비즈니스 지원 센터 — 협찬 광고 게시물의 레이블 정보', url: 'https://www.facebook.com/business/help/213764212711862', checked },
  kakaoShortformChallenge: { label: '카카오 — 카톡 숏폼 챌린지로 창작자 발굴 및 성장 지원 (2026. 1. 5.)', url: 'https://www.kakaocorp.com/page/detail/11876', checked },
} satisfies Record<string, GuideSource>;
