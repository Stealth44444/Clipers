import { avatarGradient, initials } from '../lib/avatar';
import { cx } from '../lib/cx';

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  if (src) {
    // no-referrer: some image hosts (YouTube channel photos on yt3.ggpht.com) refuse requests from other sites.
    return <img alt="" className={cx('cl-avatar', `cl-avatar--${size}`)} referrerPolicy="no-referrer" src={src} />;
  }
  return (
    <span aria-hidden className={cx('cl-avatar', `cl-avatar--${size}`)} style={{ backgroundImage: avatarGradient(name) }}>
      {initials(name)}
    </span>
  );
}
