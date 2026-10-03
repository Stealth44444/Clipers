// Pre-launch lock: while PRELAUNCH_PASSWORD is set, the site and the app answer only to HTTP Basic auth with that
// password (any user name), so the deployment can run without strangers signing up or search engines indexing it.
// Middleware imports this file directly (not the package index) to keep the edge bundle small; it uses only web APIs.

/**
 * Open while locked: cron routes carry their own secret, robots.txt tells crawlers to stay out, and the notification
 * emails' logo has to load in mail clients, which can't send the password.
 */
const OPEN_PATHS = [/^\/api\/cron\//, /^\/robots\.txt$/, /^\/logo\/clipers-email-mark\.png$/];

const encoder = new TextEncoder();

function suppliedPassword(authorization: string | null): Uint8Array | null {
  const match = authorization?.match(/^Basic\s+(\S+)$/i);
  if (!match) return null;
  let decoded: string;
  try {
    decoded = atob(match[1]);
  } catch {
    return null;
  }
  const colon = decoded.indexOf(':');
  if (colon < 0) return null;
  // atob gives one character per byte; the password's bytes are UTF-8.
  return Uint8Array.from(decoded.slice(colon + 1), (char) => char.charCodeAt(0));
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

/** The 401 to send while locked, or null when the request may go on. */
export function prelaunchGate(pathname: string, authorization: string | null, password: string | undefined): Response | null {
  if (!password) return null;
  if (OPEN_PATHS.some((pattern) => pattern.test(pathname))) return null;

  const supplied = suppliedPassword(authorization);
  if (supplied && sameBytes(supplied, encoder.encode(password))) return null;

  return new Response('출시 전이라 비밀번호가 있어야 들어올 수 있어요.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Clipers", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
}
