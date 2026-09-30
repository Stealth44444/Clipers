import type { Metadata } from 'next';
import LegalPending from '../legal-pending';

export const metadata: Metadata = { title: '개인정보 처리방침 · Clipers' };

export default function PrivacyPage() {
  return <LegalPending title="개인정보 처리방침" />;
}
