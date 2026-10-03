'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { renderNotification } from '@clipers/db';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Item = { id: string; kind: string; data: Record<string, unknown>; link: string | null; read_at: string | null; created_at: string };

const timeAgo = (iso: string) => {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}일 전` : new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
};

/** The top-bar bell: unread count, and the latest 20 notifications, all marked read when the list opens. */
export default function NotificationBell() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[] | null>(null);

  const loadCount = useCallback(async () => {
    const { count } = await getSupabaseBrowserClient().from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
    setUnread(count ?? 0);
  }, []);

  useEffect(() => {
    void loadCount();
  }, [loadCount, pathname]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from('notifications').select('id, kind, data, link, read_at, created_at').order('created_at', { ascending: false }).limit(20);
    setItems((data ?? []) as Item[]);
    if (unread > 0) {
      await supabase.rpc('mark_notifications_read');
      setUnread(0);
    }
  }

  return (
    <div className="cl-notifications" ref={ref}>
      <button aria-expanded={open} aria-haspopup="dialog" aria-label={unread > 0 ? `알림 ${unread}개 안 읽음` : '알림'} className="cl-notifications__trigger" onClick={() => void toggle()} type="button">
        <Bell size={18} />
        {unread > 0 && <span className="cl-notifications__dot">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div aria-label="알림" className="cl-notifications__panel" role="dialog">
          <p className="cl-notifications__heading">알림</p>
          {items === null ? (
            <p className="cl-notifications__empty">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="cl-notifications__empty">아직 알림이 없어요.</p>
          ) : (
            <ul className="cl-notifications__list">
              {items.map((item) => {
                const { title, body } = renderNotification(item.kind, item.data);
                const content = (
                  <>
                    <span className="cl-notifications__title">
                      {!item.read_at && <span aria-hidden className="cl-notifications__unread" />}
                      {title}
                    </span>
                    {body && <span className="cl-notifications__body">{body}</span>}
                    <span className="cl-notifications__time">{timeAgo(item.created_at)}</span>
                  </>
                );
                return (
                  <li key={item.id}>
                    {item.link ? (
                      <Link className="cl-notifications__item" href={item.link} onClick={() => setOpen(false)}>
                        {content}
                      </Link>
                    ) : (
                      <div className="cl-notifications__item">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
