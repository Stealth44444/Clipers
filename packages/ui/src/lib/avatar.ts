const HANGUL = /[ㄱ-ㆎ가-힣]/;

export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (HANGUL.test(trimmed[0])) return trimmed[0];

  const words = trimmed.split(/\s+/);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return Array.from(trimmed).slice(0, 2).join('').toUpperCase();
}
