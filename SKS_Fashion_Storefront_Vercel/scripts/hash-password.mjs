import crypto from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Pass a password of at least 12 characters.");
  process.exit(1);
}
const salt = crypto.randomBytes(18).toString("base64url");
const N = 16384;
const r = 8;
const p = 1;
const digest = crypto.scryptSync(password, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 }).toString("base64url");
console.log(`scrypt$${N}$${r}$${p}$${salt}$${digest}`);
