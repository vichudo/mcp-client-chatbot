import type { MCPServerConfig } from "app-types/mcp";
import type {
  MCPClientsManager,
  MCPConfigStorage,
} from "./create-mcp-clients-manager";

// Default MCP configs that don't require file system writes
const DEFAULT_MCP_CONFIGS: Record<string, MCPServerConfig> = {
  custom: {
    command: "node",
    args: ["./custom-mcp-server/index.js"],
  },
  database_url_assistant: {
    command: "node",
    args: ["./custom-mcp-server/database-url.js"],
  },
};

/**
 * Creates an in-memory implementation of MCPConfigStorage for Vercel
 * This avoids file system writes which aren't allowed in Vercel's serverless environment
 */
export function createVercelMCPConfigsStorage(): MCPConfigStorage {
  const configs = new Map<string, MCPServerConfig>();
  
  // Pre-populate with default configs
  Object.entries(DEFAULT_MCP_CONFIGS).forEach(([name, config]) => {
    configs.set(name, config);
  });

  return {
    async init(_manager: MCPClientsManager): Promise<void> {
      // No file operations needed in memory storage
      console.log("Initialized in-memory MCP config storage for Vercel");
    },
    
    async loadAll(): Promise<Record<string, MCPServerConfig>> {
      return Object.fromEntries(configs);
    },
    
    async save(name: string, config: MCPServerConfig): Promise<void> {
      configs.set(name, config);
    },
    
    async delete(name: string): Promise<void> {
      configs.delete(name);
    },
    
    async has(name: string): Promise<boolean> {
      return configs.has(name);
    },
  };
} 