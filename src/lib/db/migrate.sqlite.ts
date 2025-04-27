import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { join } from "path";

config();

const runMigrate = async () => {
  let client;

  try {
    // First attempt to connect to Turso
    if (process.env.TURSO_SYNC_URL && process.env.TURSO_AUTH_TOKEN) {
      console.log("Connecting to Turso database for migrations at:", process.env.TURSO_SYNC_URL);
      
      // Parse the URL correctly - ensure libsql:// protocol
      let tursoUrl = process.env.TURSO_SYNC_URL;
      
      // Remove any https:// or http:// prefix
      tursoUrl = tursoUrl.replace(/^https?:\/\//, "");
      
      // If URL doesn't have libsql:// prefix, add it
      if (!tursoUrl.startsWith("libsql://")) {
        tursoUrl = `libsql://${tursoUrl}`;
      }
      
      // Remove any trailing slash
      tursoUrl = tursoUrl.replace(/\/$/, "");
      
      console.log("Formatted Turso URL for migration:", tursoUrl);
      
      client = createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN?.replace(/\s+/g, ""), // Remove any whitespace
      });
      
      // Test the connection
      try {
        const testQuery = await client.execute("SELECT 1");
        console.log("Turso connection test successful for migration:", testQuery);
      } catch (err) {
        console.error("Turso connection test failed for migration:", err);
        throw err; // Rethrow to trigger fallback
      }
    } else {
      // Fallback to local SQLite
      console.log("Turso credentials not found, using local SQLite for migrations...");
      client = createClient({
        url: process.env.FILEBASE_URL!,
      });
    }
  } catch (error) {
    console.error("Error connecting to Turso:", error);
    console.log("Falling back to local SQLite for migrations...");
    client = createClient({
      url: process.env.FILEBASE_URL!,
    });
  }

  const sqliteDb = drizzle({ client });

  console.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(sqliteDb, {
    migrationsFolder: join(process.cwd(), "src/lib/db/migrations/sqlite"),
  });
  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
