import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDrizzleDb, isDatabaseConfigured } from '@/lib/db/pg';
import * as schema from '@/src/db/schema';

function getAuthDatabase() {
  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return undefined;
  }
  return drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  });
}

function sanitizeAuthUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'http://localhost:3000';
  }
  let url = rawUrl.trim();
  if (!url) {
    return 'http://localhost:3000';
  }

  // Correct common user typos like "localhost://3000" or missing "http://"
  if (url.startsWith('localhost://')) {
    url = url.replace(/^localhost:\/\//, 'http://localhost:');
  } else if (url.startsWith('localhost:')) {
    url = 'http://' + url;
  } else if (url.startsWith('127.0.0.1://')) {
    url = url.replace(/^127\.0\.0\.1:\/\//, 'http://127.0.0.1:');
  } else if (url.startsWith('127.0.0.1:')) {
    url = 'http://' + url;
  } else if (!/^https?:\/\//i.test(url)) {
    url = (url.includes('.run.app') || url.includes('.vercel.app'))
      ? `https://${url}`
      : `http://${url}`;
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'http://localhost:3000';
    }
    return parsed.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

// Clean any malformed environment variable in process.env so internal Better Auth checks never fail
if (typeof process !== 'undefined' && process.env) {
  if (process.env.BETTER_AUTH_URL) {
    process.env.BETTER_AUTH_URL = sanitizeAuthUrl(process.env.BETTER_AUTH_URL);
  }
  if (process.env.APP_URL) {
    process.env.APP_URL = sanitizeAuthUrl(process.env.APP_URL);
  }
}

const safeBaseURL = sanitizeAuthUrl(
  process.env.APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000'
);

export const auth = betterAuth({
  database: getAuthDatabase(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'member',
      },
      department: {
        type: 'string',
        required: false,
      },
      status: {
        type: 'string',
        defaultValue: 'active',
      },
    },
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    'planit-better-auth-secret-key-production-safe-default-2026',
  baseURL: safeBaseURL,
});
