import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/mobile";

/**
 * Countries whose mobile numbers can sign up. India is the launch market;
 * the US is allowed while the development environment runs in AWS US East.
 */
export const SUPPORTED_PHONE_COUNTRIES = ["IN", "US"] as const;
export type PhoneCountry = (typeof SUPPORTED_PHONE_COUNTRIES)[number];

export const PHONE_COUNTRY_DIAL_CODES: Record<PhoneCountry, string> = {
  IN: "+91",
  US: "+1",
};

export type PhoneParseResult =
  | { ok: true; e164: string; country: PhoneCountry }
  | { ok: false; reason: "invalid" | "country_not_allowed" };

/**
 * Normalizes user input to E.164 (for example "+919876543210") and checks
 * that the number is a valid mobile number in one of the allowed countries.
 * The "mobile" metadata treats landlines as invalid, since they cannot
 * receive SMS codes.
 * `defaultCountry` is used when the input has no leading "+".
 */
export function parsePhone(
  input: string,
  allowed: readonly PhoneCountry[],
  defaultCountry?: PhoneCountry,
): PhoneParseResult {
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry as CountryCode | undefined);
  if (!parsed || !parsed.isValid()) return { ok: false, reason: "invalid" };

  const country = parsed.country;
  if (!country || !(allowed as readonly string[]).includes(country)) {
    return { ok: false, reason: "country_not_allowed" };
  }
  return { ok: true, e164: parsed.number, country: country as PhoneCountry };
}

/** Parses a comma-separated list such as "IN,US" from configuration. */
export function parsePhoneCountries(value: string): PhoneCountry[] {
  const codes = value
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  for (const code of codes) {
    if (!(SUPPORTED_PHONE_COUNTRIES as readonly string[]).includes(code)) {
      throw new Error(`Unsupported phone country: ${code}`);
    }
  }
  return codes as PhoneCountry[];
}
