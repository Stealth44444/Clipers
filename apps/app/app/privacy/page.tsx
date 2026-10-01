import type { Metadata } from 'next';
import LegalDocument from '../legal-document';

export const metadata: Metadata = { title: '개인정보 처리방침 · Clipers' };

export default function PrivacyPage() {
  return <LegalDocument name="privacy" />;
}
