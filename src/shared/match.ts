/**
 * Normalize user input ("https://www.Twitter.com/home") to a bare hostname
 * ("twitter.com"). Returns null if no plausible hostname can be extracted.
 */
export function normalizeSite(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  s = s.split(/[/?#]/)[0];
  s = s.split(':')[0];
  s = s.replace(/^www\./, '');
  if (!/^[a-z0-9.-]+$/.test(s) || !s.includes('.')) return null;
  return s;
}

/** True if hostname is the site itself or any subdomain of it. */
export function hostnameMatches(hostname: string, site: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  return h === site || h.endsWith('.' + site);
}

export function hostnameOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
