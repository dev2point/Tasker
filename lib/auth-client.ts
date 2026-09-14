import { createAuthClient } from 'better-auth/react';

function getClientBaseURL(): string | undefined {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const rawUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL;
  if (!rawUrl) return undefined;
  let url = rawUrl.trim();
  if (url.startsWith('localhost://')) {
    url = url.replace(/^localhost:\/\//, 'http://localhost:');
  } else if (url.startsWith('localhost:')) {
    url = 'http://' + url;
  } else if (!/^https?:\/\//i.test(url)) {
    url = url.includes('.run.app') ? `https://${url}` : `http://${url}`;
  }
  try {
    return new URL(url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

// Clean any malformed env var in SSR environment
if (typeof process !== 'undefined' && process.env) {
  if (process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL.startsWith('localhost://')) {
    process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL.replace(/^localhost:\/\//, 'http://localhost:');
  }
  if (process.env.APP_URL && process.env.APP_URL.startsWith('localhost://')) {
    process.env.APP_URL = process.env.APP_URL.replace(/^localhost:\/\//, 'http://localhost:');
  }
}

export const authClient = createAuthClient({
  baseURL: getClientBaseURL(),
  fetchOptions: {
    credentials: 'include',
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
