/* eslint-env jest */
/* global describe, test, expect */
import { decodeAddress } from "../btc";

// ─── BIP-173 / BIP-350 / Bitcoin reference test vectors ─────────────────────
// hash160 / witness-program hex values are what we expect the decoder to return.
describe("decodeAddress — P2PKH (base58check)", () => {
  test("Genesis address (Satoshi)", () => {
    const r = decodeAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    expect(r).not.toBeNull();
    expect(r.type).toBe("p2pkh");
    expect(r.hash160).toBe("62e907b15cbf27d5425399ebf6f0fb50ebb88f18");
  });

  test("trims whitespace", () => {
    const r = decodeAddress("  1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa  ");
    expect(r).not.toBeNull();
    expect(r.type).toBe("p2pkh");
  });
});

describe("decodeAddress — P2SH (base58check)", () => {
  test("Bitfinex hack address", () => {
    const r = decodeAddress("3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5");
    expect(r).not.toBeNull();
    expect(r.type).toBe("p2sh");
    expect(r.hash160).toBe("982a9dacf9e0365a252185cb664fca73a559bc89");
  });
});

describe("decodeAddress — P2WPKH (bech32, witness v0)", () => {
  // BIP-173 reference vector
  test("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4 (upper)", () => {
    const r = decodeAddress("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4");
    expect(r).not.toBeNull();
    expect(r.type).toBe("p2wpkh");
    expect(r.witness_version).toBe(0);
    expect(r.hash160).toBe("751e76e8199196d454941c45d1b3a323f1433bd6");
  });

  test("lower-case equivalent decodes identically", () => {
    const r = decodeAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
    expect(r).not.toBeNull();
    expect(r.hash160).toBe("751e76e8199196d454941c45d1b3a323f1433bd6");
  });
});

describe("decodeAddress — P2WSH (bech32, witness v0)", () => {
  // BIP-173 reference vector
  test("bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3", () => {
    const r = decodeAddress(
      "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3",
    );
    expect(r).not.toBeNull();
    expect(r.type).toBe("p2wsh");
    expect(r.witness_version).toBe(0);
    expect(r.hash160).toBe(
      "1863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262",
    );
  });
});

describe("decodeAddress — P2TR (bech32m, witness v1)", () => {
  // BIP-350 reference vector — segwit v1 taproot output (witness program = x-only pubkey)
  test("bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0", () => {
    const r = decodeAddress(
      "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
    );
    expect(r).not.toBeNull();
    expect(r.type).toBe("p2tr");
    expect(r.witness_version).toBe(1);
    expect(r.hash160).toBe(
      "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    );
  });

  test("Real-world taproot address decodes with v1 + 32-byte program", () => {
    const r = decodeAddress(
      "bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9",
    );
    expect(r).not.toBeNull();
    expect(r.type).toBe("p2tr");
    expect(r.witness_version).toBe(1);
    expect(r.hash160).toHaveLength(64); // 32 bytes = 64 hex chars
  });
});

describe("decodeAddress — rejects invalid input", () => {
  test("empty string", () => {
    expect(decodeAddress("")).toBeNull();
  });
  test("null", () => {
    expect(decodeAddress(null)).toBeNull();
  });
  test("undefined", () => {
    expect(decodeAddress(undefined)).toBeNull();
  });
  test("garbage base58", () => {
    expect(decodeAddress("not-a-real-address-1234567890")).toBeNull();
  });
  test("malformed bech32", () => {
    expect(decodeAddress("bc1qinvalid")).toBeNull();
  });
  test("base58 with bad checksum", () => {
    expect(decodeAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb")).toBeNull();
  });
});

describe("decodeAddress — testnet & alt prefixes", () => {
  test("testnet bech32 (tb1) decodes", () => {
    // BIP-173 testnet vector
    const r = decodeAddress(
      "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
    );
    expect(r).not.toBeNull();
    expect(r.witness_version).toBe(0);
  });
});
