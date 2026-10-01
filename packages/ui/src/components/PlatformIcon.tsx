import { siFacebook, siInstagram, siKakaotalk, siNaver, siTiktok, siX, siYoutube, type SimpleIcon } from 'simple-icons';
import { cx } from '../lib/cx';

// Official brand marks from Simple Icons (CC0). Keys are the platform values stored on campaigns and clips.
// Placeholder until the brand-supplied platform PNGs arrive; swap the render below for those images then.
const ICONS: Record<string, SimpleIcon> = {
  youtube_shorts: siYoutube,
  tiktok: siTiktok,
  instagram_reels: siInstagram,
  facebook: siFacebook,
  x: siX,
  naver_clip: siNaver,
  kakao_shorts: siKakaotalk,
};

export function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const icon = ICONS[platform];
  if (!icon) return null;
  return (
    <svg aria-hidden fill="currentColor" height={size} role="img" viewBox="0 0 24 24" width={size}>
      <path d={icon.path} />
    </svg>
  );
}

/** Circular platform marks, as on Whop campaign cards. */
export function PlatformIcons({ platforms, label, size = 'md' }: { platforms: string[]; label?: string; size?: 'sm' | 'md' }) {
  return (
    <span aria-label={label} className={cx('cl-platforms', `cl-platforms--${size}`)} role={label ? 'img' : undefined}>
      {platforms.map((platform) => (
        <span className="cl-platforms__item" key={platform} title={platform}>
          <PlatformIcon platform={platform} size={size === 'sm' ? 13 : 15} />
        </span>
      ))}
    </span>
  );
}
