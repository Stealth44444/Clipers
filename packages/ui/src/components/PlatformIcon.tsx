import { cx } from '../lib/cx';

// Brand-supplied platform logos, normalised to 96px squares (masters in packages/ui/brand/platforms) and served
// from each app's /platforms folder. Keys are the platform values stored on campaigns and clips.
const KNOWN = new Set(['youtube_shorts', 'tiktok', 'instagram_reels', 'facebook', 'x', 'naver_clip', 'kakao_shorts']);

export function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  if (!KNOWN.has(platform)) return null;
  return <img alt="" className="cl-platform-icon" height={size} src={`/platforms/${platform}.png`} width={size} />;
}

export function PlatformIcons({ platforms, label, size = 'md' }: { platforms: string[]; label?: string; size?: 'sm' | 'md' }) {
  return (
    <span aria-label={label} className={cx('cl-platforms', `cl-platforms--${size}`)} role={label ? 'img' : undefined}>
      {platforms.map((platform) => (
        <PlatformIcon key={platform} platform={platform} size={size === 'sm' ? 16 : 20} />
      ))}
    </span>
  );
}
