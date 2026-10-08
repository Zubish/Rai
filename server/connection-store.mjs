export async function createConnectionStore() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw Object.assign(new Error('Rai session database is not configured.'), { status: 503 });
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  return {
    async allow(key, now, limit = 30) {
      const current = new Date(now).toISOString(), reset = new Date(now + 60000).toISOString();
      const rows = await sql`INSERT INTO rai_connection_rate_limits (key_hash, request_count, reset_at) VALUES (${key}, 1, ${reset})
        ON CONFLICT (key_hash) DO UPDATE SET request_count = CASE WHEN rai_connection_rate_limits.reset_at <= ${current} THEN 1 ELSE rai_connection_rate_limits.request_count + 1 END,
        reset_at = CASE WHEN rai_connection_rate_limits.reset_at <= ${current} THEN ${reset}::timestamptz ELSE rai_connection_rate_limits.reset_at END RETURNING request_count`;
      await sql`DELETE FROM rai_connection_rate_limits WHERE reset_at < ${new Date(now - 3600000).toISOString()}`;
      await sql`DELETE FROM rai_connection_sessions WHERE expires_at <= ${current}`;
      return rows[0].request_count <= limit;
    },
    async save(kind, hash, payload, expires) {
      await sql`INSERT INTO rai_connection_sessions(kind, token_hash, payload, expires_at) VALUES (${kind}, ${hash}, ${payload}, ${new Date(expires).toISOString()})`;
    },
    async take(kind, hash, now) {
      const rows = await sql`DELETE FROM rai_connection_sessions WHERE kind=${kind} AND token_hash=${hash} RETURNING payload, expires_at`;
      return rows[0] && new Date(rows[0].expires_at).getTime() > now ? rows[0].payload : undefined;
    },
    async get(kind, hash, now) {
      const rows = await sql`SELECT payload FROM rai_connection_sessions WHERE kind=${kind} AND token_hash=${hash} AND expires_at > ${new Date(now).toISOString()}`;
      return rows[0]?.payload;
    },
    async update(kind, hash, transform, now) {
      const rows = await sql`SELECT payload FROM rai_connection_sessions WHERE kind=${kind} AND token_hash=${hash} AND expires_at > ${new Date(now).toISOString()}`;
      if (!rows[0]) throw Object.assign(new Error('Connection expired.'), { status: 401 });
      await sql`UPDATE rai_connection_sessions SET payload=${transform(rows[0].payload)} WHERE kind=${kind} AND token_hash=${hash} AND expires_at > ${new Date(now).toISOString()}`;
    }
  };
}
