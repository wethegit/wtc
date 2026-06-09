import { describe, expect, test } from "bun:test";
import { encrypt, decrypt } from "../../src/config/crypto.ts";

describe("crypto", () => {
  test("encrypt and decrypt round-trip", () => {
    const password = "test-master-password-123";
    const plaintext = JSON.stringify({
      github: { token: "ghp_test_token_12345" },
      teamwork: { apiKey: "tw_test_api_key" },
    });

    const payload = encrypt(plaintext, password);

    expect(payload.salt).toBeTruthy();
    expect(payload.iv).toBeTruthy();
    expect(payload.authTag).toBeTruthy();
    expect(payload.data).toBeTruthy();

    const decrypted = decrypt(payload, password);
    expect(decrypted).toBe(plaintext);
  });

  test("wrong password fails", () => {
    const plaintext = "secret-data";
    const payload = encrypt(plaintext, "correct-password");

    expect(() => decrypt(payload, "wrong-password")).toThrow();
  });

  test("different salts produce different ciphertexts", () => {
    const plaintext = "same-data";
    const password = "same-password";

    const payload1 = encrypt(plaintext, password);
    const payload2 = encrypt(plaintext, password);

    expect(payload1.salt).not.toBe(payload2.salt);
    expect(payload1.data).not.toBe(payload2.data);
  });
});
