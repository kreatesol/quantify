const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body.error ?? "unknown_error", body.retryAfterSeconds);
  return body as T;
}

export type User = { id: string; phone: string };

export const api = {
  requestCode: (phone: string) =>
    call<{ phone: string }>("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyCode: (phone: string, code: string) =>
    call<{ token: string; user: User; isNewUser: boolean }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
  me: (token: string) => call<User & { createdAt: string }>("/me", { token }),
};

/** Plain-language message for an API error code. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Could not reach Quantify. Check your connection and try again.";
  switch (error.code) {
    case "invalid_phone":
      return "That doesn't look like a mobile number.";
    case "country_not_allowed":
      return "Quantify only accepts Indian and US mobile numbers for now.";
    case "too_many_requests":
      return `Too many codes sent. Try again in ${formatWait(error.retryAfterSeconds ?? 60)}.`;
    case "invalid_code":
      return "That code is not right. Check the SMS and try again.";
    case "expired":
      return "That code has expired. Ask for a new one.";
    case "too_many_attempts":
      return "Too many wrong tries. Ask for a new code.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function formatWait(seconds: number): string {
  return seconds < 120 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`;
}
