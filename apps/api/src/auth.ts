import { Pool, neonConfig } from '@neondatabase/serverless';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const auth = betterAuth({
  database: pool,
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
