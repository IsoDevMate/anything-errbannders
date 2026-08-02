import { createClient, type Client } from '@libsql/client';
import { getLibsqlConfig } from './db-config';

const config = getLibsqlConfig();
const client: Client = createClient(
  config.authToken ? { url: config.url, authToken: config.authToken } : { url: config.url }
);

// Tagged template wrapper — matches the neon `sql` interface used throughout routes
async function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> {
  let query = '';
  const args: unknown[] = [];

  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      args.push(values[i]);
      query += `?`;
    }
  });

  const result = await client.execute({ sql: query, args: args as any[] });
  return result.rows as any[];
}

export async function execRaw(query: string): Promise<void> {
  await client.execute(query);
}

export default sql;
