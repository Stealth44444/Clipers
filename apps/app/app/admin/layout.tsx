import type { ReactNode } from 'react';
import { getSession } from '@/lib/session';
import WorkspaceShell from '../workspace-shell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await getSession();
  return (
    <WorkspaceShell displayName={profile.display_name} role="admin">
      {children}
    </WorkspaceShell>
  );
}
