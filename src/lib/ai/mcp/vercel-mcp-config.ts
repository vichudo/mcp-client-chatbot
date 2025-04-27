import type { MCPServerConfig } from "app-types/mcp";
import type {
  MCPClientsManager,
  MCPConfigStorage,
} from "./create-mcp-clients-manager";

// Default MCP configs for Vercel - use HTTP-based servers instead of local processes
const DEFAULT_MCP_CONFIGS: Record<string, MCPServerConfig> = {
  custom: {
    // For Vercel, we'll use HTTP-based MCP servers instead of local processes
    url: "https://mcp-weather-1f8ca5c8a7b2.fly.dev/sse",
    headers: {}
  },
  database_url_assistant: {
    url: "https://81ce-186-107-3-60.ngrok-free.app/sse",
    headers: {}
  },
};

// Fallback configs for local development
const LOCAL_MCP_CONFIGS: Record<string, MCPServerConfig> = {
  custom: {
    command: "node",
    args: ["./custom-mcp-server/index.js"],
  },
  database_url_assistant: {
    command: "node",
    args: ["./custom-mcp-server/database-url.js"],
  },
  assistant: {
    command: "node",
    args: ["./custom-mcp-server/assistant.js"],
  }
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
 * Returns the current MCP configurations
 */
export function getConfigs(): Record<string, MCPServerConfig> {
  if (!globalThis.__mcpConfigs__) {
    globalThis.__mcpConfigs__ = new Map<string, MCPServerConfig>();
    globalThis.__mcpConfigsInitialized__ = false;
    
    // Initialize with default configs
    const configSet = process.env.VERCEL === "1" ? DEFAULT_MCP_CONFIGS : LOCAL_MCP_CONFIGS;
    Object.entries(configSet).forEach(([name, config]) => {
      globalThis.__mcpConfigs__?.set(name, config);
    });
    globalThis.__mcpConfigsInitialized__ = true;
  }
  
  return Object.fromEntries(globalThis.__mcpConfigs__);
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

  // Choose appropriate config set based on environment
  const configSet = process.env.VERCEL === "1" ? DEFAULT_MCP_CONFIGS : LOCAL_MCP_CONFIGS;

  return {
    async init(_manager: MCPClientsManager): Promise<void> {
      // No file operations needed in memory storage
      console.log("Initialized in-memory MCP config storage for Vercel");
      
      // Only populate with default configs if not already initialized
      if (!globalThis.__mcpConfigsInitialized__) {
        console.log("First initialization - populating with default configs");
        Object.entries(configSet).forEach(([name, config]) => {
          if (!configs.has(name)) {
            configs.set(name, config);
          }
        });
        globalThis.__mcpConfigsInitialized__ = true;
      }
      
      console.log(`Current MCP configs: ${Array.from(configs.keys()).join(', ')}`);
      console.log(`Running in Vercel: ${process.env.VERCEL === "1" ? "Yes" : "No"}`);
    },
    
    async loadAll(): Promise<Record<string, MCPServerConfig>> {
      // Ensure we have the default configs
      if (!globalThis.__mcpConfigsInitialized__) {
        Object.entries(configSet).forEach(([name, config]) => {
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
      if (!configs.has(name) && configSet[name]) {
        // Automatically add default configs if requested but not found
        configs.set(name, configSet[name]);
        return true;
      }
      return configs.has(name);
    },
  };
} 