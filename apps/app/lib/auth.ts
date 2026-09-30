const MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않습니다.'],
  [/user already registered/i, '이미 가입된 이메일입니다. 로그인해 주세요.'],
  [/email not confirmed/i, '이메일 인증이 아직 완료되지 않았습니다. 받은 메일의 링크를 열어 주세요.'],
  [/password should be at least/i, '비밀번호는 8자 이상이어야 합니다.'],
  [/rate limit|too many requests/i, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'],
  [/unable to validate email|invalid email/i, '이메일 주소 형식을 확인해 주세요.'],
];

export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export function safeNextPath(value: string | null | undefined): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}
