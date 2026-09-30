import type { Metadata } from 'next';
import LegalPending from '../legal-pending';

export const metadata: Metadata = { title: '이용약관 · Clipers' };

export default function TermsPage() {
  return <LegalPending title="이용약관" />;
}
