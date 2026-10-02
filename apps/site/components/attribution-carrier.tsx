'use client';

import { useEffect } from 'react';
import { captureAttribution, withAttribution, type Attribution } from '@clipers/db';
import { appUrl } from '@/lib/urls';

// Remembers how a visitor first arrived (utm/ref query, referrer host, landing page) for this tab, and hands it to
// the app on the way to sign-up by rewriting any link to the app's /login as it is clicked. Session storage, not a
// cookie: it is gone when the tab closes, and the privacy policy's "no analytics cookies" stays true.
// Design: docs/superpowers/specs/2026-10-02-signup-attribution-design.md.

export const ATTRIBUTION_STORAGE_KEY = 'clipers.attribution';
const LOGIN_URL = appUrl('/login');

function remembered(): Attribution | null {
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

export default function AttributionCarrier() {
  useEffect(() => {
    try {
      if (!remembered()) {
        const first = captureAttribution(new URL(window.location.href), document.referrer, new Date());
        window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(first));
      }
    } catch {
      // Storage can be blocked; the sign-up then simply carries nothing.
    }

    // Rewriting href during the click (or middle-click) means the navigation, new tab included, uses the new URL.
    const carry = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || !anchor.href.startsWith(LOGIN_URL)) return;
      const attribution = remembered();
      if (attribution) anchor.href = withAttribution(anchor.href, attribution);
    };
    document.addEventListener('click', carry, true);
    document.addEventListener('auxclick', carry, true);
    return () => {
      document.removeEventListener('click', carry, true);
      document.removeEventListener('auxclick', carry, true);
    };
  }, []);

  return null;
}
