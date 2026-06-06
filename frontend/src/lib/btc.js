// Decode Bitcoin address (base58check P2PKH/P2SH or bech32 P2WPKH/P2WSH/P2TR) to hash160 hex string.
// Returns { type, hash160 } or null on failure.
import bs58check from "bs58check";
import { bech32, bech32m } from "bech32";

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function decodeAddress(address) {
  if (!address || typeof address !== "string") return null;
  const a = address.trim();

  // Bech32 / Bech32m  (bc1..., tb1...)
  if (/^(bc1|tb1)/i.test(a)) {
    try {
      const lower = a.toLowerCase();
      // Try bech32 first (v0 witness), then bech32m (v1+)
      let dec;
      try {
        dec = bech32.decode(lower);
      } catch {
        dec = bech32m.decode(lower);
      }
      const version = dec.words[0];
      const program = bech32.fromWords(dec.words.slice(1));
      const hex = bytesToHex(program);
      let type = "p2wsh";
      if (version === 0 && program.length === 20) type = "p2wpkh";
      else if (version === 0 && program.length === 32) type = "p2wsh";
      else if (version === 1 && program.length === 32) type = "p2tr";
      return { type, hash160: hex, witness_version: version };
    } catch {
      return null;
    }
  }

  // Base58check (1... = P2PKH, 3... = P2SH)
  try {
    const decoded = bs58check.decode(a);
    if (decoded.length !== 21) return null;
    const version = decoded[0];
    const payload = decoded.slice(1);
    const hex = bytesToHex(payload);
    if (version === 0x00) return { type: "p2pkh", hash160: hex };
    if (version === 0x05) return { type: "p2sh", hash160: hex };
    if (version === 0x6f) return { type: "p2pkh-testnet", hash160: hex };
    if (version === 0xc4) return { type: "p2sh-testnet", hash160: hex };
    return { type: `v${version.toString(16)}`, hash160: hex };
  } catch {
    return null;
  }
}
