import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const createDbClient = () => {
  // Try to connect to Turso, fallback to local SQLite if not available
  let client;

  try {
    // First attempt to connect to Turso
    if (process.env.TURSO_SYNC_URL && process.env.TURSO_AUTH_TOKEN) {
      console.log("Connecting to Turso database at:", process.env.TURSO_SYNC_URL);
      const tursoUrl = process.env.TURSO_SYNC_URL.startsWith("libsql://") 
        ? process.env.TURSO_SYNC_URL 
        : `libsql://${process.env.TURSO_SYNC_URL}`;
      
      client = createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      
      // Test the connection immediately to verify credentials
      (async () => {
        try {
          const testQuery = await client.execute("SELECT 1");
          console.log("Turso connection test successful:", testQuery);
        } catch (err) {
          console.error("Turso connection test failed:", err);
          console.log("Falling back to local SQLite after failed test...");
          // If connection test fails, fallback to local SQLite
          client = createClient({
            url: process.env.FILEBASE_URL!,
          });
        }
      })();
    } else {
      // Fallback to local SQLite
      console.log("Turso credentials not found, using local SQLite...");
      client = createClient({
        url: process.env.FILEBASE_URL!,
      });
    }
  } catch (error) {
    console.error("Error connecting to Turso:", error);
    console.log("Falling back to local SQLite...");
    client = createClient({
      url: process.env.FILEBASE_URL!,
    });
  }

  return client;
};

// For Vercel serverless functions, we need to handle connection differently
// https://vercel.com/guides/using-databases-with-vercel
let cachedClient;

const getDbClient = () => {
  // Check the environment
  const isVercel = process.env.VERCEL === "1";
  
  if (isVercel) {
    // In production, we want to reuse connections across requests when possible
    // to avoid connection limits
    if (!cachedClient) {
      cachedClient = createDbClient();
    }
    return cachedClient;
  } else {
    // In development, create a new client for each request
    return createDbClient();
  }
};

export const sqliteDb = drizzle({ client: getDbClient() });
