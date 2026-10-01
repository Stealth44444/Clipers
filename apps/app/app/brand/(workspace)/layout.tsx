import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { ButtonLink } from '@clipers/ui';
import { getSession } from '@/lib/session';
import WorkspaceShell from '../../workspace-shell';

export default async function BrandLayout({ children }: { children: ReactNode }) {
  const { profile } = await getSession();
  return (
    <WorkspaceShell
      displayName={profile.display_name}
      role="brand"
      topbarExtra={
        <ButtonLink href="/brand/campaigns/new" icon={<Plus size={16} />} size="sm" variant="primary">
          캠페인 만들기
        </ButtonLink>
      }
    >
      {children}
    </WorkspaceShell>
  );
}
