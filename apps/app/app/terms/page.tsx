import type { Metadata } from 'next';
import LegalDocument from '../legal-document';

export const metadata: Metadata = { title: '이용약관 · Clipers' };

export default function TermsPage() {
  return <LegalDocument name="terms" />;
}
