import { MCPClient } from "lib/ai/mcp/create-mcp-client";
import { getConfigs } from "lib/ai/mcp/vercel-mcp-config";
import type { MCPServerInfo } from "app-types/mcp";
import logger from "logger";
import { Tool } from "ai";

// Cleanup interval in milliseconds
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Maximum idle time before disconnecting a client
const MAX_IDLE_TIME = 10 * 60 * 1000; // 10 minutes

// We need to use var here for global variables that persist across module reloads
// eslint-disable-next-line no-var
var __mcpClientsManager__: {
  clients: Map<string, MCPClient>;
  lastCleanup: number;
  lastInitialized: number;
} | null = null;

/**
 * Helper function to create MCP tool ID
 */
function createMCPToolId(clientName: string, toolName: string): string {
  return `${clientName}_${toolName}`;
}

/**
 * Manager for MCP client instances
 * Handles client lifecycle, cleanup, and reconnection
 */
export class MCPClientsManager {
  private clients: Map<string, MCPClient>;
  private lastCleanup: number;
  private log = logger.withTag("MCPClientsManager");

  constructor() {
    // Initialize or reuse the global clients map
    if (__mcpClientsManager__) {
      this.log.debug("Reusing existing MCP clients manager");
      this.clients = __mcpClientsManager__.clients;
      this.lastCleanup = __mcpClientsManager__.lastCleanup;
    } else {
      this.log.debug("Creating new MCP clients manager");
      this.clients = new Map();
      this.lastCleanup = Date.now();
      __mcpClientsManager__ = {
        clients: this.clients,
        lastCleanup: this.lastCleanup,
        lastInitialized: Date.now()
      };
    }

    // Perform cleanup if needed
    this.maybeCleanup();
    
    // Update initialization timestamp
    if (__mcpClientsManager__) {
      __mcpClientsManager__.lastInitialized = Date.now();
    }
  }

  /**
   * Get all available MCP tools as a flat object
   * This maintains compatibility with the old interface
   */
  tools(): Record<string, Tool> {
    const allTools: Record<string, Tool> = {};
    
    // Collect tools from all connected clients
    for (const client of this.clients.values()) {
      const info = client.getInfo();
      
      // Only include tools from connected clients
      if (info.status === "connected") {
        for (const [toolName, tool] of Object.entries(client.tools)) {
          const fullToolId = createMCPToolId(info.name, toolName);
          allTools[fullToolId] = tool;
        }
      }
    }
    
    return allTools;
  }

  /**
   * Get all available MCP servers
   */
  async getServers(): Promise<MCPServerInfo[]> {
    const mcpConfigs = getConfigs();
    const servers: MCPServerInfo[] = [];

    for (const [name, config] of Object.entries(mcpConfigs)) {
      let client = this.clients.get(name);

      if (!client) {
        this.log.debug(`Creating new MCP client for ${name}`);
        client = new MCPClient(name, config);
        this.clients.set(name, client);
      }

      servers.push(client.getInfo());
    }

    return servers;
  }

  /**
   * Get an MCP client by name
   * Will attempt to connect if not already connected
   */
  async getClient(name: string): Promise<MCPClient> {
    const mcpConfigs = getConfigs();
    const config = mcpConfigs[name];

    if (!config) {
      throw new Error(`MCP client ${name} not found`);
    }

    let client = this.clients.get(name);

    if (!client) {
      this.log.debug(`Creating new MCP client for ${name}`);
      client = new MCPClient(name, config);
      this.clients.set(name, client);
    }

    // Ensure the client is connected
    await client.connect();
    return client;
  }

  /**
   * Disconnect and remove a client by name
   */
  async removeClient(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      this.log.debug(`Disconnecting MCP client ${name}`);
      await client.disconnect();
      this.clients.delete(name);
    }
  }

  /**
   * Perform cleanup if it's been too long since the last cleanup
   * Disconnects idle clients to free up resources
   */
  private maybeCleanup() {
    const now = Date.now();
    
    // Only clean up if it's been long enough since the last cleanup
    if (now - this.lastCleanup < CLEANUP_INTERVAL) {
      return;
    }
    
    this.log.debug("Performing MCP clients cleanup");
    
    // Check each client in the global map and disconnect if it's been idle too long
    if (globalThis.__mcpClientInstances__) {
      for (const [name, instance] of globalThis.__mcpClientInstances__.entries()) {
        if (now - instance.lastUsed > MAX_IDLE_TIME) {
          this.log.debug(`Disconnecting idle MCP client ${name}`);
          
          try {
            // Only disconnect, don't remove from the cache
            instance.client.close().catch(e => this.log.error(e));
            instance.isConnected = false;
            
            // Also remove from our local clients map if present
            if (this.clients.has(name)) {
              this.clients.delete(name);
            }
          } catch (error) {
            this.log.error(`Error disconnecting idle client ${name}:`, error);
          }
        }
      }
    }
    
    this.lastCleanup = now;
    if (__mcpClientsManager__) {
      __mcpClientsManager__.lastCleanup = now;
    }
  }
}

// Create and export a singleton instance
const mcpClientsManager = new MCPClientsManager();
export { mcpClientsManager };
