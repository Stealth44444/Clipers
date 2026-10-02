import type { Metadata } from 'next';
import ResetPasswordForm from './reset-password-form';

export const metadata: Metadata = { title: '비밀번호 재설정 · Clipers' };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
