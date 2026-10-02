import type { Metadata } from 'next';
import { getSession } from '@/lib/session';
import OnboardingFlow from './onboarding-flow';

export const metadata: Metadata = { title: '시작하기 · Clipers' };

export default async function OnboardingPage() {
  // The sign-up link said which role the visitor came for; the role step starts on it and can still be changed.
  const { profile } = await getSession();
  return <OnboardingFlow initialRole={profile.role === 'brand' ? 'brand' : 'creator'} />;
}
