import type { Metadata } from 'next';
import ContactForm from '@/components/contact-form';
import LandingChrome from '@/components/landing-chrome';
import { INQUIRY_INDUSTRIES } from '@/lib/inquiry';

export const metadata: Metadata = {
  title: '상담 문의 — Clipers',
  description: '숏폼 클리핑 캠페인의 구성, 예산, 일정이 궁금하면 남겨 주세요. 운영팀이 이메일로 답해 드려요.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ industry?: string; from?: string }> }) {
  const { industry, from } = await searchParams;
  const knownIndustry = industry && (INQUIRY_INDUSTRIES as readonly string[]).includes(industry) ? industry : undefined;
  return (
    <LandingChrome cta="캠페인 시작하기" path="/brands">
      <div className="cl-contact">
        <h1>상담 문의</h1>
        <p className="cl-contact__lead">캠페인 구성, 예산, 일정이 궁금하면 남겨 주세요. 운영팀이 이메일로 답해 드려요.</p>
        <ContactForm industry={knownIndustry} sourcePath={from?.startsWith('/') ? from : '/contact'} />
      </div>
    </LandingChrome>
  );
}
