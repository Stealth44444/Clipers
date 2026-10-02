const MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않아요.'],
  [/user already registered/i, '이미 가입된 이메일이에요. 로그인해 주세요.'],
  [/email not confirmed/i, '이메일 인증이 아직 끝나지 않았어요. 받은 메일의 링크를 열어 주세요.'],
  [/password should be at least/i, '비밀번호는 8자 이상이어야 해요.'],
  [/same password|different from the old password/i, '이전과 다른 비밀번호를 입력해 주세요.'],
  [/weak password|too weak/i, '더 복잡한 비밀번호를 입력해 주세요.'],
  [/email rate limit|email_send_rate_limit/i, '메일 발송 한도에 걸렸어요. 잠시 후 다시 시도해 주세요.'],
  [/rate limit|too many requests/i, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'],
  [/unable to validate email|invalid email/i, '이메일 주소 형식을 확인해 주세요.'],
  [/signups? not allowed|signup is disabled/i, '지금은 가입을 받지 않아요.'],
  [/session|not logged in|auth session missing/i, '로그인 상태가 아니에요. 다시 로그인해 주세요.'],
];

export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function safeNextPath(value: string | null | undefined): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}
