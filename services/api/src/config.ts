import { parsePhoneCountries, type PhoneCountry } from "@quantify/shared";
import { z } from "zod";

const schema = z.object({
  // Optional: without it, node-postgres reads PGHOST, PGUSER, PGPASSWORD,
  // PGDATABASE, PGPORT and PGSSLMODE, which is how the AWS deployment connects.
  DATABASE_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(16),
  OTP_SECRET: z.string().min(16),
  ALLOWED_PHONE_COUNTRIES: z.string().default("IN,US"),
  SMS_PROVIDER: z.enum(["console", "sns"]).default("console"),
  // Development runs in AWS US East; production moves to Mumbai (ap-south-1).
  AWS_REGION: z.string().default("us-east-1"),
});

export type Config = {
  databaseUrl: string | undefined;
  port: number;
  jwtSecret: string;
  otpSecret: string;
  allowedPhoneCountries: PhoneCountry[];
  smsProvider: "console" | "sns";
  awsRegion: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.parse(env);
  return {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    jwtSecret: parsed.JWT_SECRET,
    otpSecret: parsed.OTP_SECRET,
    allowedPhoneCountries: parsePhoneCountries(parsed.ALLOWED_PHONE_COUNTRIES),
    smsProvider: parsed.SMS_PROVIDER,
    awsRegion: parsed.AWS_REGION,
  };
}
