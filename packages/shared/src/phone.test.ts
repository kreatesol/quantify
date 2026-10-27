import { describe, expect, it } from "vitest";
import { parsePhone, parsePhoneCountries } from "./phone";

describe("parsePhone", () => {
  it("normalizes an Indian mobile number", () => {
    expect(parsePhone("98765 43210", ["IN", "US"], "IN")).toEqual({
      ok: true,
      e164: "+919876543210",
      country: "IN",
    });
  });

  it("normalizes a US number given with a country code", () => {
    expect(parsePhone("+1 (415) 555-2671", ["IN", "US"])).toEqual({
      ok: true,
      e164: "+14155552671",
      country: "US",
    });
  });

  it("rejects a valid number from a country that is not allowed", () => {
    expect(parsePhone("+1 415 555 2671", ["IN"])).toEqual({ ok: false, reason: "country_not_allowed" });
    expect(parsePhone("+44 7911 123456", ["IN", "US"])).toEqual({ ok: false, reason: "country_not_allowed" });
  });

  it("rejects malformed input", () => {
    expect(parsePhone("12345", ["IN", "US"], "IN")).toEqual({ ok: false, reason: "invalid" });
    expect(parsePhone("not a number", ["IN", "US"])).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an Indian landline", () => {
    expect(parsePhone("+91 11 2345 6789", ["IN"])).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("parsePhoneCountries", () => {
  it("parses a configured list", () => {
    expect(parsePhoneCountries(" in, US ")).toEqual(["IN", "US"]);
  });

  it("rejects unsupported countries", () => {
    expect(() => parsePhoneCountries("IN,GB")).toThrow("Unsupported phone country: GB");
  });
});
