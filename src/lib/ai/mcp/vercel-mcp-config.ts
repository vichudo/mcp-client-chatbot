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

// Global storage for MCP configs to maintain state between serverless function invocations
declare global {
  // We need to use var here for global variables that persist across module reloads
  // eslint-disable-next-line no-var
  var __mcpConfigs__: Map<string, MCPServerConfig> | undefined;
  // eslint-disable-next-line no-var
  var __mcpConfigsInitialized__: boolean | undefined;
}

/**
 * Creates an in-memory implementation of MCPConfigStorage for Vercel
 * This avoids file system writes which aren't allowed in Vercel's serverless environment
 */
export function createVercelMCPConfigsStorage(): MCPConfigStorage {
  // Initialize or use existing global storage
  if (!globalThis.__mcpConfigs__) {
    globalThis.__mcpConfigs__ = new Map<string, MCPServerConfig>();
    globalThis.__mcpConfigsInitialized__ = false;
  }
  
  // Use the global configs map
  const configs = globalThis.__mcpConfigs__;

  return {
    async init(_manager: MCPClientsManager): Promise<void> {
      // No file operations needed in memory storage
      console.log("Initialized in-memory MCP config storage for Vercel");
      
      // Only populate with default configs if not already initialized
      if (!globalThis.__mcpConfigsInitialized__) {
        console.log("First initialization - populating with default configs");
        Object.entries(DEFAULT_MCP_CONFIGS).forEach(([name, config]) => {
          if (!configs.has(name)) {
            configs.set(name, config);
          }
        });
        globalThis.__mcpConfigsInitialized__ = true;
      }
      
      console.log(`Current MCP configs: ${Array.from(configs.keys()).join(', ')}`);
    },
    
    async loadAll(): Promise<Record<string, MCPServerConfig>> {
      // Ensure we have the default configs
      if (!globalThis.__mcpConfigsInitialized__) {
        Object.entries(DEFAULT_MCP_CONFIGS).forEach(([name, config]) => {
          if (!configs.has(name)) {
            configs.set(name, config);
          }
        });
        globalThis.__mcpConfigsInitialized__ = true;
      }
      
      return Object.fromEntries(configs);
    },
    
    async save(name: string, config: MCPServerConfig): Promise<void> {
      configs.set(name, config);
      console.log(`Saved MCP config: ${name}`);
      console.log(`Current MCP configs: ${Array.from(configs.keys()).join(', ')}`);
    },
    
    async delete(name: string): Promise<void> {
      configs.delete(name);
      console.log(`Deleted MCP config: ${name}`);
      console.log(`Current MCP configs: ${Array.from(configs.keys()).join(', ')}`);
    },
    
    async has(name: string): Promise<boolean> {
      if (!configs.has(name) && DEFAULT_MCP_CONFIGS[name]) {
        // Automatically add default configs if requested but not found
        configs.set(name, DEFAULT_MCP_CONFIGS[name]);
        return true;
      }
      return configs.has(name);
    },
  };
} 