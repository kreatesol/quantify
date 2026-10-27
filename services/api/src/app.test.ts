import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.ts";
import { OTP_MAX_ATTEMPTS } from "./auth/otp.ts";
import { createDb, migrate } from "./db.ts";
import type { SmsSender } from "./sms/index.ts";

const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgres://quantify:quantify@localhost:5432/quantify_test";

class FakeSms implements SmsSender {
  sent: { to: string; message: string }[] = [];
  async send(to: string, message: string) {
    this.sent.push({ to, message });
  }
  lastCode(): string {
    return this.sent.at(-1)!.message.slice(0, 6);
  }
}

const db = createDb(databaseUrl);
const sms = new FakeSms();
const app = await buildApp({
  db,
  sms,
  jwtSecret: "test-jwt-secret-0123456789",
  otpSecret: "test-otp-secret-0123456789",
  allowedPhoneCountries: ["IN", "US"],
});

const post = (url: string, payload: object) => app.inject({ method: "POST", url, payload });

beforeAll(async () => {
  await migrate(db);
});

beforeEach(async () => {
  sms.sent = [];
  await db.query("TRUNCATE users, otp_challenges");
});

afterAll(async () => {
  await app.close();
  await db.end();
});

describe("phone OTP login", () => {
  it("signs up a US number, then logs the same user in again", async () => {
    const request = await post("/auth/otp/request", { phone: "+1 415 555 2671" });
    expect(request.statusCode).toBe(202);
    expect(request.json()).toEqual({ phone: "+14155552671" });
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0]!.to).toBe("+14155552671");

    const verify = await post("/auth/otp/verify", { phone: "+14155552671", code: sms.lastCode() });
    expect(verify.statusCode).toBe(200);
    const first = verify.json();
    expect(first.isNewUser).toBe(true);

    const me = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${first.token}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ id: first.user.id, phone: "+14155552671" });

    // A second login after the resend gap returns the same user.
    await db.query("UPDATE otp_challenges SET created_at = now() - interval '1 minute'");
    await post("/auth/otp/request", { phone: "+14155552671" });
    const again = await post("/auth/otp/verify", { phone: "+14155552671", code: sms.lastCode() });
    expect(again.json()).toMatchObject({ isNewUser: false, user: { id: first.user.id } });
  });

  it("accepts Indian numbers", async () => {
    const request = await post("/auth/otp/request", { phone: "+91 98765 43210" });
    expect(request.statusCode).toBe(202);
    const verify = await post("/auth/otp/verify", { phone: "+919876543210", code: sms.lastCode() });
    expect(verify.statusCode).toBe(200);
  });

  it("rejects numbers from other countries without sending a code", async () => {
    const response = await post("/auth/otp/request", { phone: "+44 7911 123456" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "country_not_allowed" });
    expect(sms.sent).toHaveLength(0);
  });

  it("rejects a wrong code and a code that is used twice", async () => {
    await post("/auth/otp/request", { phone: "+14155552671" });
    const code = sms.lastCode();
    const wrong = code === "000000" ? "111111" : "000000";

    expect((await post("/auth/otp/verify", { phone: "+14155552671", code: wrong })).statusCode).toBe(401);
    expect((await post("/auth/otp/verify", { phone: "+14155552671", code })).statusCode).toBe(200);
    expect((await post("/auth/otp/verify", { phone: "+14155552671", code })).statusCode).toBe(401);
  });

  it("locks a code after too many wrong guesses", async () => {
    await post("/auth/otp/request", { phone: "+14155552671" });
    const code = sms.lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      await post("/auth/otp/verify", { phone: "+14155552671", code: wrong });
    }
    const response = await post("/auth/otp/verify", { phone: "+14155552671", code });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "too_many_attempts" });
  });

  it("rejects an expired code", async () => {
    await post("/auth/otp/request", { phone: "+14155552671" });
    await db.query("UPDATE otp_challenges SET expires_at = now() - interval '1 second'");
    const response = await post("/auth/otp/verify", { phone: "+14155552671", code: sms.lastCode() });
    expect(response.json()).toEqual({ error: "expired" });
  });

  it("limits how often codes can be sent", async () => {
    expect((await post("/auth/otp/request", { phone: "+14155552671" })).statusCode).toBe(202);
    const tooSoon = await post("/auth/otp/request", { phone: "+14155552671" });
    expect(tooSoon.statusCode).toBe(429);
    expect(Number(tooSoon.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("requires a valid token for /me", async () => {
    expect((await app.inject({ method: "GET", url: "/me" })).statusCode).toBe(401);
  });
});
