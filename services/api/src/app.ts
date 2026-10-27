import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import type { PhoneCountry } from "@quantify/shared";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { OtpService } from "./auth/otp.ts";
import { registerAuthRoutes } from "./auth/routes.ts";
import type { Db } from "./db.ts";
import type { SmsSender } from "./sms/index.ts";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

export type AppDeps = {
  db: Db;
  sms: SmsSender;
  jwtSecret: string;
  otpSecret: string;
  allowedPhoneCountries: PhoneCountry[];
  logger?: boolean;
};

export async function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: deps.logger ?? false });
  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: deps.jwtSecret });

  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
  };

  app.get("/health", async () => ({ ok: true }));

  registerAuthRoutes(app, new OtpService(deps.db, deps.sms, deps.otpSecret), deps.allowedPhoneCountries);

  app.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const { rows } = await deps.db.query<{ id: string; phone: string; created_at: Date }>(
      "SELECT id, phone, created_at FROM users WHERE id = $1",
      [request.user.sub],
    );
    const user = rows[0];
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { id: user.id, phone: user.phone, createdAt: user.created_at.toISOString() };
  });

  return app;
}
