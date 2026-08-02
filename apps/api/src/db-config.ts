/**
 * LibSQL / Turso config.
 * Uses Turso when LIBSQL_URL is set (starts with libsql:// or https://).
 * Falls back to a local SQLite file for local dev without any env vars.
 */
export type LibsqlConfig = { url: string; authToken?: string };

export function getLibsqlConfig(): LibsqlConfig {
  const url = process.env.LIBSQL_URL;

  if (url && (url.startsWith('libsql://') || url.startsWith('https://'))) {
    const authToken = process.env.LIBSQL_AUTH_TOKEN;
    if (!authToken) {
      console.warn('[db] LIBSQL_URL is set but LIBSQL_AUTH_TOKEN is missing — Turso requests will likely fail');
    }
    return { url, authToken };
  }

  // Local dev fallback
  const fileUrl = url ?? 'file:data.db';
  console.log(`[db] using local sqlite at ${fileUrl}`);
  return { url: fileUrl };
}
