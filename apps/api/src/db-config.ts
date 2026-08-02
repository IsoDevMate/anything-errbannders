/**
 * Shared LibSQL / local SQLite config.
 *
 * Default: local file DB (file:data.db) so the API works even when Render has
 * stale/broken Turso credentials.
 *
 * Opt into Turso with: USE_TURSO=true + LIBSQL_URL + LIBSQL_AUTH_TOKEN
 */
export type LibsqlConfig = { url: string; authToken?: string };

export function getLibsqlConfig(): LibsqlConfig {
  const useTurso = process.env.USE_TURSO === 'true';
  const url = process.env.LIBSQL_URL;

  if (useTurso && url && (url.startsWith('libsql://') || url.startsWith('https://'))) {
    console.log(`[db] using Turso at ${url}`);
    return { url, authToken: process.env.LIBSQL_AUTH_TOKEN };
  }

  if (url && (url.startsWith('libsql://') || url.startsWith('https://'))) {
    console.warn(
      '[db] LIBSQL_URL is set but USE_TURSO is not true — ignoring Turso and using local sqlite. Set USE_TURSO=true to use Turso.'
    );
  }

  const fileUrl = process.env.LOCAL_DB_URL ?? 'file:data.db';
  console.log(`[db] using local sqlite at ${fileUrl}`);
  return { url: fileUrl };
}
