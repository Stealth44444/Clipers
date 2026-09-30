import type { Metadata } from 'next';
import OnboardingFlow from './onboarding-flow';

export const metadata: Metadata = { title: '시작하기 · Clipers' };

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
