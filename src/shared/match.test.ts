import { describe, expect, it } from 'vitest';

import { hostnameMatches, hostnameOf, normalizeSite } from './match';

describe('normalizeSite', () => {
  it('normalizes URLs and host-like input to bare hostnames', () => {
    expect(normalizeSite('https://www.Twitter.com/home?src=nav')).toBe('twitter.com');
    expect(normalizeSite('www.youtube.com:443/watch?v=abc')).toBe('youtube.com');
    expect(normalizeSite('  REDDIT.COM/r/all  ')).toBe('reddit.com');
  });

  it('rejects empty and non-host input', () => {
    expect(normalizeSite('')).toBeNull();
    expect(normalizeSite('localhost')).toBeNull();
    expect(normalizeSite('not a host.com')).toBeNull();
  });
});

describe('hostnameMatches', () => {
  it('matches the configured hostname and its subdomains', () => {
    expect(hostnameMatches('twitter.com', 'twitter.com')).toBe(true);
    expect(hostnameMatches('mobile.twitter.com', 'twitter.com')).toBe(true);
    expect(hostnameMatches('www.twitter.com', 'twitter.com')).toBe(true);
  });

  it('does not match lookalike suffixes', () => {
    expect(hostnameMatches('eviltwitter.com', 'twitter.com')).toBe(false);
    expect(hostnameMatches('twitter.com.example.com', 'twitter.com')).toBe(false);
  });
});

describe('hostnameOf', () => {
  it('extracts normalized hostnames from http and https URLs', () => {
    expect(hostnameOf('https://www.example.com/path')).toBe('example.com');
    expect(hostnameOf('http://sub.example.com:8080/path')).toBe('sub.example.com');
  });

  it('returns null for unsupported or invalid URLs', () => {
    expect(hostnameOf('chrome://extensions')).toBeNull();
    expect(hostnameOf('not a url')).toBeNull();
  });
});
