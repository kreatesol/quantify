import { loadConfig } from "./config.ts";
import { createDb, migrate } from "./db.ts";

const db = createDb(loadConfig().databaseUrl);
try {
  const ran = await migrate(db);
  console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Database is up to date.");
} finally {
  await db.end();
}
