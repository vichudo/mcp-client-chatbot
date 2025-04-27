import { createFileBasedMCPConfigsStorage } from "lib/ai/mcp/fb-mcp-config-storage";
import { createVercelMCPConfigsStorage } from "lib/ai/mcp/vercel-mcp-config";
import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "lib/ai/mcp/create-mcp-clients-manager";
import { IS_DEV } from "lib/const";

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

let mcpClientsManager: MCPClientsManager;
if (IS_DEV) {
  if (!globalThis.__mcpClientsManager__) {
    globalThis.__mcpClientsManager__ = createMCPClientsManager(storage);
    await globalThis.__mcpClientsManager__.init();
  }
  mcpClientsManager = globalThis.__mcpClientsManager__;
} else {
  mcpClientsManager = createMCPClientsManager(storage);
  if (!process.env.MCP_NO_INITIAL) {
    mcpClientsManager.init();
  }
}

export { mcpClientsManager };
