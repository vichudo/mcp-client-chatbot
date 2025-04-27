import { createFileBasedMCPConfigsStorage } from "lib/ai/mcp/fb-mcp-config-storage";
import { createVercelMCPConfigsStorage } from "lib/ai/mcp/vercel-mcp-config";
import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "lib/ai/mcp/create-mcp-clients-manager";

declare global {
  // eslint-disable-next-line no-var
  var __mcpClientsManager__: MCPClientsManager | undefined;
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
} else {
  console.log("Using existing MCP clients manager");
}

const mcpClientsManager = globalThis.__mcpClientsManager__;

export { mcpClientsManager };
