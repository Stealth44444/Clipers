export const PLATFORMS = [
  { value: 'youtube_shorts', label: '유튜브 쇼츠' },
  { value: 'tiktok', label: '틱톡' },
  { value: 'instagram_reels', label: '릴스' },
  { value: 'facebook', label: '페이스북' },
  { value: 'x', label: 'X' },
  { value: 'naver_clip', label: '네이버 클립' },
  { value: 'kakao_shorts', label: '카카오 쇼츠' },
] as const;

export type PlatformValue = (typeof PLATFORMS)[number]['value'];

const LABEL_BY_VALUE = new Map<string, string>(PLATFORMS.map((platform) => [platform.value, platform.label]));

export function platformLabel(value: string): string {
  return LABEL_BY_VALUE.get(value) ?? value;
}

export function platformLabels(values: readonly string[]): string {
  return values.map(platformLabel).join(', ');
}
