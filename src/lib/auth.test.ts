import { describe, expect, it } from "vitest";
import { digestSessionToken, hashPassword, normalizeUsername, validatePassword, validateUsername, verifyPassword } from "./auth";

describe("user authentication primitives", () => {
  it("normalizes and validates usernames", () => { expect(normalizeUsername("  Jose_User ")).toBe("jose_user"); expect(validateUsername("reader-01")).toBe(true); expect(validateUsername("no spaces")).toBe(false); });
  it("enforces a meaningful password length", () => { expect(validatePassword("short")).toBe(false); expect(validatePassword("a-secure-passphrase")).toBe(true); });
  it("hashes and verifies passwords without storing plaintext", async () => { const result = await hashPassword("a-secure-passphrase", "00112233445566778899aabbccddeeff", 1_000); expect(result.hash).not.toContain("passphrase"); expect(await verifyPassword("a-secure-passphrase", result.hash, result.salt, result.iterations)).toBe(true); expect(await verifyPassword("wrong-password", result.hash, result.salt, result.iterations)).toBe(false); });
  it("creates stable one-way session digests", async () => { expect(await digestSessionToken("token-a")).toBe(await digestSessionToken("token-a")); expect(await digestSessionToken("token-a")).not.toBe(await digestSessionToken("token-b")); });
});
