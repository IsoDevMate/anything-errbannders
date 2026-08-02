import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { getLibsqlConfig } from './db-config';
import sql from './db';

const config = getLibsqlConfig();

export const auth = betterAuth({
  database: {
    dialect: new LibsqlDialect(
      config.authToken
        ? { url: config.url, authToken: config.authToken }
        : { url: config.url }
    ),
    type: 'sqlite',
  },
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me-errandeconomy',
  baseURL: process.env.BETTER_AUTH_URL ?? 'https://anything-errbannders.onrender.com',
  trustedOrigins: [
    ...(process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean),
    'http://localhost:8081',
    'http://localhost:8082',
    'exp://127.0.0.1:8082',
    'exp://192.168.1.104:8082',
  ],
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  advanced: {
    defaultCookieAttributes: { sameSite: 'none', secure: true, httpOnly: true, path: '/' },
  },
  session: { cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 7 } },
  plugins: [bearer()],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            // Give every new user a wallet with a small demo balance so escrow works
            await sql`
              INSERT INTO wallets (user_id, balance)
              VALUES (${user.id}, ${1000})
            `;
          } catch (err) {
            console.error('Failed to create wallet for user', user.id, err);
          }
        },
      },
    },
  },
});
