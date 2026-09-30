import { cx } from '../lib/cx';
import type { Tone } from './Badge';

export function ProgressBar({ value, tone = 'brand', label }: { value: number; tone?: Tone; label?: string }) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped * 100)}
      className={cx('cl-progress', `cl-tone-${tone}`)}
      role="progressbar"
    >
      <div className="cl-progress__fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}
