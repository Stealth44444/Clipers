const GRADIENTS: Array<[string, string]> = [
  ['#58b982', '#2f6c48'],
  ['#75c7f0', '#6e56cf'],
  ['#ffc53d', '#e54d2e'],
  ['#baa7ff', '#58b982'],
  ['#ff977d', '#baa7ff'],
  ['#7fd6a4', '#75c7f0'],
];

const HANGUL = /[ㄱ-ㆎ가-힣]/;

export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (HANGUL.test(trimmed[0])) return trimmed[0];

  const words = trimmed.split(/\s+/);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return Array.from(trimmed).slice(0, 2).join('').toUpperCase();
}

export function avatarGradient(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  const [from, to] = GRADIENTS[hash % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}
