import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createDb, migrate } from "./db.ts";
import { ConsoleSmsSender, SnsSmsSender } from "./sms/index.ts";

const config = loadConfig();
const db = createDb(config.databaseUrl);
await migrate(db);

const app = await buildApp({
  db,
  sms: config.smsProvider === "sns" ? new SnsSmsSender(config.awsRegion) : new ConsoleSmsSender(console),
  jwtSecret: config.jwtSecret,
  otpSecret: config.otpSecret,
  allowedPhoneCountries: config.allowedPhoneCountries,
  logger: true,
});

await app.listen({ port: config.port, host: "0.0.0.0" });
