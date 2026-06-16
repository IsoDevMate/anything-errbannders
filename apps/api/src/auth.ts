import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { libsqlAdapter } from 'better-auth/adapters/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN!,
});

export const auth = betterAuth({
  database: libsqlAdapter(client),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  trustedOrigins: (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  advanced: {
    defaultCookieAttributes: { sameSite: 'none', secure: true, httpOnly: true, path: '/' },
  },
  session: { cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 7 } },
  plugins: [bearer()],
});
