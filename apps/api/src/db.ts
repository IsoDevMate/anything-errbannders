import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN!,
});

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

export default sql;
