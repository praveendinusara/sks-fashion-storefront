import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const directory = path.join(process.cwd(), "backups");
await mkdir(directory, { recursive: true });
const destination = path.join(directory, `store-${stamp}.db`);
await copyFile(path.join(process.cwd(), "data", "store.db"), destination);
console.log(`Backup created: ${destination}`);
