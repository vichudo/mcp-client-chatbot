import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config();

const dialect = process.env.USE_FILE_SYSTEM_DB ? "sqlite" : "postgresql";

const url = process.env.USE_FILE_SYSTEM_DB
  ? process.env.TURSO_SYNC_URL || process.env.FILEBASE_URL!
  : process.env.POSTGRES_URL!;

const schema = process.env.USE_FILE_SYSTEM_DB
  ? "./src/lib/db/schema.sqlite.ts"
  : "./src/lib/db/schema.pg.ts";

const out = process.env.USE_FILE_SYSTEM_DB
  ? "./src/lib/db/migrations/sqlite"
  : "./src/lib/db/migrations/pg";

const dbCredentials = dialect === "sqlite" 
  ? { url, authToken: process.env.TURSO_AUTH_TOKEN }
  : { url };

export default defineConfig({
  schema,
  out,
  dialect,
  migrations: {},
  dbCredentials,
});
