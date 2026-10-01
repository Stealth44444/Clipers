import type { ReactNode } from 'react';

/** `modal` renders a campaign over the grid when navigating from the marketplace (intercepted route). */
export default function MarketLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
