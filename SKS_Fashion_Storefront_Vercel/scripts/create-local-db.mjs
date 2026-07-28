import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";

const databasePath = path.join(process.cwd(), "data", "store.db");
const schemaPath = path.join(process.cwd(), "data", "schema.sql");
const seedPath = path.join(process.cwd(), "data", "seed.sql");

await rm(databasePath, { force: true });

const database = createClient({ url: `file:${databasePath}` });
const schema = await readFile(schemaPath, "utf8");
const seed = await readFile(seedPath, "utf8");

await database.executeMultiple(schema);
await database.executeMultiple(seed);
database.close();

console.log(`Created ${databasePath}`);
