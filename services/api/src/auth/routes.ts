import { parsePhone, type PhoneCountry } from "@quantify/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { OtpService } from "./otp.ts";

const requestBody = z.object({ phone: z.string().min(1).max(32) });
const verifyBody = z.object({ phone: z.string().min(1).max(32), code: z.string().regex(/^\d{6}$/) });

export const ACCESS_TOKEN_TTL = "30d";

export function registerAuthRoutes(app: FastifyInstance, otp: OtpService, allowedCountries: PhoneCountry[]) {
  app.post("/auth/otp/request", async (request, reply) => {
    const body = requestBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });

    const phone = parsePhone(body.data.phone, allowedCountries);
    if (!phone.ok) return reply.code(400).send({ error: phone.reason === "invalid" ? "invalid_phone" : phone.reason });

    const result = await otp.requestCode(phone.e164);
    if (!result.ok) {
      return reply
        .code(429)
        .header("retry-after", String(result.retryAfterSeconds))
        .send({ error: result.reason, retryAfterSeconds: result.retryAfterSeconds });
    }
    return reply.code(202).send({ phone: phone.e164 });
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    const body = verifyBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });

    const phone = parsePhone(body.data.phone, allowedCountries);
    if (!phone.ok) return reply.code(400).send({ error: phone.reason === "invalid" ? "invalid_phone" : phone.reason });

    const result = await otp.verifyCode(phone.e164, phone.country, body.data.code);
    if (!result.ok) return reply.code(401).send({ error: result.reason });

    const token = await reply.jwtSign({ sub: result.userId }, { expiresIn: ACCESS_TOKEN_TTL });
    return reply.send({ token, user: { id: result.userId, phone: phone.e164 }, isNewUser: result.isNewUser });
  });
}
