import { createFileBasedMCPConfigsStorage } from "lib/ai/mcp/fb-mcp-config-storage";
import { createVercelMCPConfigsStorage } from "lib/ai/mcp/vercel-mcp-config";
import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "lib/ai/mcp/create-mcp-clients-manager";

declare global {
  // We need to use var here for global variables that persist across module reloads
  // eslint-disable-next-line no-var
  var __mcpClientsManager__: MCPClientsManager | undefined;
  // eslint-disable-next-line no-var
  var __lastInitialized__: number | undefined;
}

// Determine if running in Vercel's production environment
const isVercel = process.env.VERCEL === "1";

// Use file-based storage in development, in-memory storage in Vercel production
const storage = isVercel 
  ? createVercelMCPConfigsStorage()
  : createFileBasedMCPConfigsStorage();

// Always use a global variable for the clients manager to maintain state
// This is important for both development and production (serverless) environments
if (!globalThis.__mcpClientsManager__) {
  console.log("Creating new MCP clients manager");
  globalThis.__mcpClientsManager__ = createMCPClientsManager(storage);
  
  // Initialize the manager (don't skip in production)
  globalThis.__mcpClientsManager__.init().catch(err => {
    console.error("Failed to initialize MCP clients manager:", err);
  });
  
  // Record initialization time
  globalThis.__lastInitialized__ = Date.now();
} else {
  console.log("Using existing MCP clients manager");
  
  // Check if we need to reinitialize (e.g., after a long time)
  const now = Date.now();
  const lastInit = globalThis.__lastInitialized__ || 0;
  const timeSinceInit = now - lastInit;
  
  // Reinitialize if more than 10 minutes have passed
  if (timeSinceInit > 10 * 60 * 1000) {
    console.log("Reinitializing MCP clients manager after idle period");
    globalThis.__mcpClientsManager__.init().catch(err => {
      console.error("Failed to reinitialize MCP clients manager:", err);
    });
    globalThis.__lastInitialized__ = now;
  }
}

const mcpClientsManager = globalThis.__mcpClientsManager__;

export { mcpClientsManager };
