import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

/**
 * A phone frame for marketing visuals: titanium rim, black bezel, Dynamic Island, side buttons, status bar and
 * home indicator. It scales with its width (container units), so set the width on the frame or its parent.
 * The screen is dark by default; content fills it edge to edge.
 */
export function DeviceFrame({ children, className, statusBar = true }: { children?: ReactNode; className?: string; statusBar?: boolean }) {
  return (
    <div aria-hidden className={cx('cl-device', className)}>
      <span className="cl-device__button cl-device__button--action" />
      <span className="cl-device__button cl-device__button--volume-up" />
      <span className="cl-device__button cl-device__button--volume-down" />
      <span className="cl-device__button cl-device__button--power" />
      <div className="cl-device__body">
        <div className="cl-device__screen">
          {children}
          {statusBar && (
            <div className="cl-device__status">
              <span>9:41</span>
              <span className="cl-device__status-icons">
                <svg viewBox="0 0 18 12">
                  <rect height="4" rx="1" width="3" x="0" y="8" />
                  <rect height="6" rx="1" width="3" x="5" y="6" />
                  <rect height="9" rx="1" width="3" x="10" y="3" />
                  <rect height="12" rx="1" width="3" x="15" y="0" />
                </svg>
                <svg viewBox="0 0 16 12">
                  <path d="M8 11.5 5.6 8.9a3.4 3.4 0 0 1 4.8 0z" />
                  <path d="M3.4 6.7a6.6 6.6 0 0 1 9.2 0l-1.4 1.4a4.6 4.6 0 0 0-6.4 0z" />
                  <path d="M1.2 4.4a9.8 9.8 0 0 1 13.6 0l-1.4 1.4a7.8 7.8 0 0 0-10.8 0z" />
                </svg>
                <svg viewBox="0 0 27 12">
                  <rect fill="none" height="11" rx="3.2" stroke="currentColor" strokeOpacity="0.45" width="23" x="0.5" y="0.5" />
                  <rect height="8" rx="2" width="17" x="2" y="2" />
                  <path d="M25 4v4a2 2 0 0 0 0-4z" opacity="0.45" />
                </svg>
              </span>
            </div>
          )}
          <span className="cl-device__island" />
          <span className="cl-device__home" />
        </div>
      </div>
    </div>
  );
}
