import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { Db } from "../db.ts";
import type { SmsSender } from "../sms/index.ts";

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_HOUR = 5;
/** Minimum gap between two codes to the same number. */
export const OTP_RESEND_SECONDS = 30;

export type RequestCodeResult = { ok: true } | { ok: false; reason: "too_many_requests"; retryAfterSeconds: number };

export type VerifyCodeResult =
  | { ok: true; userId: string; isNewUser: boolean }
  | { ok: false; reason: "invalid_code" | "expired" | "too_many_attempts" };

export class OtpService {
  constructor(
    private readonly db: Db,
    private readonly sms: SmsSender,
    private readonly secret: string,
  ) {}

  async requestCode(phoneE164: string): Promise<RequestCodeResult> {
    const { rows } = await this.db.query<{ sent_last_hour: number; seconds_since_last: number | null }>(
      `SELECT count(*)::int AS sent_last_hour,
              extract(epoch FROM now() - max(created_at))::int AS seconds_since_last
         FROM otp_challenges
        WHERE phone = $1 AND created_at > now() - interval '1 hour'`,
      [phoneE164],
    );
    const { sent_last_hour, seconds_since_last } = rows[0]!;
    if (seconds_since_last !== null && seconds_since_last < OTP_RESEND_SECONDS) {
      return { ok: false, reason: "too_many_requests", retryAfterSeconds: OTP_RESEND_SECONDS - seconds_since_last };
    }
    if (sent_last_hour >= OTP_MAX_SENDS_PER_HOUR) {
      return { ok: false, reason: "too_many_requests", retryAfterSeconds: 60 * 60 };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.db.query(
      `INSERT INTO otp_challenges (phone, code_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(secs => $3))`,
      [phoneE164, this.hash(phoneE164, code), OTP_TTL_SECONDS],
    );
    await this.sms.send(phoneE164, `${code} is your Quantify login code. It expires in 5 minutes.`);
    return { ok: true };
  }

  async verifyCode(phoneE164: string, phoneCountry: string, code: string): Promise<VerifyCodeResult> {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      // Only the most recent code counts; lock it so parallel guesses are counted.
      const { rows } = await client.query<{ id: string; code_hash: string; attempts: number; expired: boolean }>(
        `SELECT id, code_hash, attempts, expires_at <= now() AS expired
           FROM otp_challenges
          WHERE phone = $1 AND consumed_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE`,
        [phoneE164],
      );
      const challenge = rows[0];
      if (!challenge) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "invalid_code" };
      }
      if (challenge.expired) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "expired" };
      }
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "too_many_attempts" };
      }

      if (!this.matches(challenge.code_hash, this.hash(phoneE164, code))) {
        await client.query("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1", [challenge.id]);
        await client.query("COMMIT");
        return { ok: false, reason: "invalid_code" };
      }

      await client.query("UPDATE otp_challenges SET consumed_at = now() WHERE id = $1", [challenge.id]);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (phone, phone_country) VALUES ($1, $2)
         ON CONFLICT (phone) DO NOTHING
         RETURNING id`,
        [phoneE164, phoneCountry],
      );
      const userId =
        inserted.rows[0]?.id ??
        (await client.query<{ id: string }>("SELECT id FROM users WHERE phone = $1", [phoneE164])).rows[0]!.id;
      await client.query("COMMIT");
      return { ok: true, userId, isNewUser: inserted.rowCount === 1 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private hash(phoneE164: string, code: string): string {
    return createHmac("sha256", this.secret).update(`${phoneE164}:${code}`).digest("hex");
  }

  private matches(storedHex: string, candidateHex: string): boolean {
    const stored = Buffer.from(storedHex, "hex");
    const candidate = Buffer.from(candidateHex, "hex");
    return stored.length === candidate.length && timingSafeEqual(stored, candidate);
  }
}
