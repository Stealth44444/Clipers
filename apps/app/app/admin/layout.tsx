import type { ReactNode } from 'react';
import { getAdminQueueCounts } from '@/lib/admin-data';
import { getSession } from '@/lib/session';
import WorkspaceShell from '../workspace-shell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await getSession();
  const counts = await getAdminQueueCounts();
  return (
    <WorkspaceShell
      badges={{
        '/admin/applications': counts.applications,
        '/admin/clips': counts.clips,
        '/admin/view-reports': counts.viewReports,
        '/admin/disputes': counts.disputes,
        '/admin/deposits': counts.deposits,
        '/admin/settlements': counts.payouts,
        '/admin/refunds': counts.refunds,
      }}
      displayName={profile.display_name}
      role="admin"
    >
      {children}
    </WorkspaceShell>
  );
}
