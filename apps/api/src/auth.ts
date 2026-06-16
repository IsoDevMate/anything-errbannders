import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
// @ts-ignore — kysely adapter exists in dist but not in exports map
import { kyselyAdapter } from 'better-auth/dist/adapters/kysely-adapter/index.cjs';
import { Kysely } from 'kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';

const db = new Kysely({
  dialect: new LibsqlDialect({
    url: process.env.LIBSQL_URL!,
    authToken: process.env.LIBSQL_AUTH_TOKEN!,
  }),
});

export const auth = betterAuth({
  database: kyselyAdapter(db, { type: 'sqlite' }),
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
