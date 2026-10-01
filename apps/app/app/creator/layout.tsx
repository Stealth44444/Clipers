import type { ReactNode } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { fetchAllRows } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { getSession } from '@/lib/session';
import WorkspaceShell from '../workspace-shell';

export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const { supabase, user, profile } = await getSession();
  const unpaid = await fetchAllRows((from, to) =>
    supabase.from('settlements').select('amount').eq('creator_id', user.id).in('status', ['pending', 'requested']).order('id').range(from, to)
  );
  const balance = unpaid.reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <WorkspaceShell
      displayName={profile.display_name}
      role="creator"
      topbarExtra={
        <Link aria-label={`받을 금액 ${formatKRW(balance)}`} className="cl-balance" href="/creator/earnings">
          <Wallet size={15} />
          {formatKRW(balance)}
        </Link>
      }
    >
      {children}
    </WorkspaceShell>
  );
}
