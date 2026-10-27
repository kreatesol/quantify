import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export type Db = pg.Pool;

export function createDb(databaseUrl: string): Db {
  return new pg.Pool({ connectionString: databaseUrl });
}

const migrationsDir = fileURLToPath(new URL("./migrations/", import.meta.url));

/** Applies any .sql files in src/migrations that have not run yet, in name order. */
export async function migrate(db: Db): Promise<string[]> {
  const client = await db.connect();
  try {
    // Serialize concurrent migrators (for example two containers starting at once).
    await client.query("SELECT pg_advisory_lock(727274)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name));
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

    const ran: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      ran.push(file);
    }
    return ran;
  } finally {
    await client.query("SELECT pg_advisory_unlock(727274)").catch(() => {});
    client.release();
  }
}
