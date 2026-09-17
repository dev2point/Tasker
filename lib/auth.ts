import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDrizzleDb, isDatabaseConfigured } from '@/lib/db/pg';
import * as schema from '@/src/db/schema';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'auth_fallback.json');

function readDb() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = { user: [], session: [], account: [], verification: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { user: [], session: [], account: [], verification: [] };
  }
}

function writeDb(data: any) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to write fallback auth db:', err);
  }
}

function jsonFileAdapter() {
  return {
    id: 'json-file-adapter',
    create: async ({ model, data, select }: any) => {
      const db = readDb();
      if (!db[model]) db[model] = [];
      const record = { ...data };
      db[model].push(record);
      writeDb(db);
      return record;
    },
    findOne: async ({ model, where }: any) => {
      const db = readDb();
      const records = db[model] || [];
      return records.find((item: any) => {
        return where.every((w: any) => {
          if (w.operator === 'eq' || !w.operator) {
            return item[w.field] === w.value;
          }
          return false;
        });
      }) || null;
    },
    findMany: async ({ model, where }: any) => {
      const db = readDb();
      const records = db[model] || [];
      if (!where || where.length === 0) return records;
      return records.filter((item: any) => {
        return where.every((w: any) => item[w.field] === w.value);
      });
    },
    update: async ({ model, where, update }: any) => {
      const db = readDb();
      const records = db[model] || [];
      const index = records.findIndex((item: any) => {
        return where.every((w: any) => item[w.field] === w.value);
      });
      if (index === -1) return null;
      records[index] = { ...records[index], ...update };
      writeDb(db);
      return records[index];
    },
    delete: async ({ model, where }: any) => {
      const db = readDb();
      const records = db[model] || [];
      db[model] = records.filter((item: any) => {
        return !where.every((w: any) => item[w.field] === w.value);
      });
      writeDb(db);
      return true;
    },
  };
}

function getAuthDatabase() {
  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    console.log('Notice: DATABASE_URL not configured. Using robust fallback JSON authentication adapter.');
    return jsonFileAdapter();
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

  if (url.startsWith('localhost://')) {
    url = url.replace(/^localhost:\/\//, 'http://localhost:');
  } else if (url.startsWith('localhost:')) {
    url = 'http://' + url;
  } else if (url.startsWith('127.0.0.1://')) {
    url = url.replace(/^127\.0\.0\.1:\/\//, 'http://127.0.0.1:');
  } else if (url.startsWith('127.0.0.1:')) {
    url = 'http://' + url;
  } else if (!/^https?:\/\//i.test(url)) {
    url = (url.includes('.run.app') || url.includes('.vercel.app') || url.includes('.trycloudflare.com'))
      ? `https://${url}`
      : `http://${url}`;
  }

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
  plugins: [bearer()],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'member',
        input: false,
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
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://*.trycloudflare.com',
    'https://*.run.app',
    'https://*.google.com',
    'https://*.aistudio.google.com',
    'https://ai.studio',
    'https://*.europe-west2.run.app',
    'https://*.europe-west1.run.app',
    'https://*.us-central1.run.app',
  ],
  advanced: {
    useSecureCookies: false,
    trustedProxyHeaders: true,
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      partitioned: true,
      httpOnly: true,
    },
  },
});
