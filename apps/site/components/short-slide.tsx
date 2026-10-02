import type { ReactNode, Ref } from 'react';
import { Heart, MessageCircle, Music2, Plus, Send } from 'lucide-react';
import { Avatar } from '@clipers/ui';

// One short-form clip as it plays on a phone (inside DeviceFrame > .cl-short): the video, a neutral player's
// right-hand rail and the handle, caption and sound line. The chrome is no one app's. Anything after the info
// (a like burst, a progress bar) comes in as children.

export type ShortClip = { video: string; poster: string; handle: string; caption: string; tag?: string; likes: string; comments: string };

export default function ShortSlide({
  clip,
  state = 'active',
  preload = 'auto',
  videoRef,
  children,
}: {
  clip: ShortClip;
  state?: 'active' | 'past' | 'next';
  preload?: 'auto' | 'none' | 'metadata';
  videoRef?: Ref<HTMLVideoElement>;
  children?: ReactNode;
}) {
  return (
    <div className="cl-short__slide" data-state={state}>
      <video className="cl-short__media" loop muted playsInline poster={clip.poster} preload={preload} ref={videoRef} src={clip.video} />
      <span className="cl-short__scrim" />
      <div className="cl-short__rail">
        <span className="cl-short__avatar">
          <Avatar name={clip.handle} size="sm" />
          <i>
            <Plus size={9} strokeWidth={3} />
          </i>
        </span>
        <span className="cl-short__action">
          <Heart fill="currentColor" size={22} strokeWidth={0} />
          {clip.likes}
        </span>
        <span className="cl-short__action">
          <MessageCircle fill="currentColor" size={21} strokeWidth={0} />
          {clip.comments}
        </span>
        <span className="cl-short__action">
          <Send size={19} />
        </span>
      </div>
      <div className="cl-short__info">
        <p className="cl-short__handle">
          @{clip.handle} <span>팔로우</span>
        </p>
        <p className="cl-short__caption">
          {clip.caption}
          {clip.tag && (
            <>
              {' '}
              <b>{clip.tag}</b>
            </>
          )}
        </p>
        <p className="cl-short__audio">
          <Music2 size={11} />
          <span>
            <span>
              오리지널 사운드 · @{clip.handle} · 오리지널 사운드 · @{clip.handle} ·{' '}
            </span>
          </span>
        </p>
      </div>
      {children}
    </div>
  );
}
