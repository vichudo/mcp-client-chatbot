import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type MCPServerInfo,
  MCPSseConfigZodSchema,
  MCPStdioConfigZodSchema,
  type MCPServerConfig,
  type MCPToolInfo,
} from "app-types/mcp";
import { jsonSchema, Tool, tool, ToolExecutionOptions } from "ai";
import { isMaybeSseConfig, isMaybeStdioConfig } from "./is-mcp-config";
import logger from "logger";
import type { ConsolaInstance } from "consola";
import { colorize } from "consola/utils";
import { isNull, Locker, toAny } from "lib/utils";

import { safe, watchError } from "ts-safe";

// Max reconnection attempts for HTTP-based servers
const MAX_RECONNECT_ATTEMPTS = 3;

// Track client instances globally to prevent disconnection in serverless environment
declare global {
  // We need to use var here for global variables that persist across module reloads
  // eslint-disable-next-line no-var
  var __mcpClientInstances__: Map<string, { 
    client: Client, 
    tools: Record<string, Tool>,
    toolInfo: MCPToolInfo[],
    isConnected: boolean,
    lastUsed: number,
    reconnectAttempts: number,
    isSSE: boolean
  }> | undefined;
}

// Initialize the global store if it doesn't exist
if (!globalThis.__mcpClientInstances__) {
  globalThis.__mcpClientInstances__ = new Map();
}

/**
 * Client class for Model Context Protocol (MCP) server connections
 */
export class MCPClient {
  private client?: Client;
  private error?: unknown;
  private isConnected = false;
  private log: ConsolaInstance;
  private locker = new Locker();
  private reconnectAttempts = 0;
  private isSSE = false;
  
  // Information about available tools from the server
  toolInfo: MCPToolInfo[] = [];
  // Tool instances that can be used for AI functions
  tools: { [key: string]: Tool } = {};

  constructor(
    private name: string,
    private serverConfig: MCPServerConfig,
  ) {
    this.log = logger.withDefaults({
      message: colorize("cyan", `MCP Client ${this.name}: `),
    });
    
    // Check if this is an SSE-based client
    this.isSSE = isMaybeSseConfig(this.serverConfig);
    
    // Attempt to restore from global cache
    const cachedInstance = globalThis.__mcpClientInstances__?.get(name);
    if (cachedInstance) {
      this.log.debug(`Restored MCP client ${name} from global cache`);
      this.client = cachedInstance.client;
      this.tools = cachedInstance.tools;
      this.toolInfo = cachedInstance.toolInfo;
      this.isConnected = cachedInstance.isConnected;
      this.reconnectAttempts = cachedInstance.reconnectAttempts;
      this.isSSE = cachedInstance.isSSE;
      
      // Update last used timestamp
      cachedInstance.lastUsed = Date.now();
    }
  }
  
  getInfo(): MCPServerInfo {
    return {
      name: this.name,
      config: this.serverConfig,
      status: this.locker.isLocked
        ? "loading"
        : this.isConnected
          ? "connected"
          : "disconnected",
      error: this.error,
      toolInfo: this.toolInfo,
    };
  }

  /**
   * Connect to the MCP server
   * Do not throw Error
   * @returns this
   */
  async connect() {
    // First check the global cache - only use if connected and not too many reconnect attempts
    const cachedInstance = globalThis.__mcpClientInstances__?.get(this.name);
    if (cachedInstance && 
        cachedInstance.isConnected && 
        cachedInstance.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.log.debug(`Using cached MCP client ${this.name}`);
      this.client = cachedInstance.client;
      this.tools = cachedInstance.tools;
      this.toolInfo = cachedInstance.toolInfo;
      this.isConnected = true;
      this.reconnectAttempts = cachedInstance.reconnectAttempts;
      
      // Update last used timestamp
      cachedInstance.lastUsed = Date.now();
      return this.client;
    }
    
    if (this.locker.isLocked) {
      await this.locker.wait();
      return this.client;
    }
    
    if (this.isConnected && this.client && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      return this.client;
    }
    
    // If max reconnect attempts reached for HTTP, reset and try again
    if (this.isSSE && this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.log.debug(`Max reconnect attempts reached for ${this.name}, resetting connection`);
      this.reconnectAttempts = 0;
      this.isConnected = false;
      this.client = undefined;
      
      // Also reset in global cache
      if (globalThis.__mcpClientInstances__?.has(this.name)) {
        globalThis.__mcpClientInstances__.delete(this.name);
      }
    }
    
    try {
      const startedAt = Date.now();
      this.locker.lock();
      const client = new Client({
        name: this.name,
        version: "1.0.0",
      });

      let transport: Transport;
      // Create appropriate transport based on server config type
      if (isMaybeStdioConfig(this.serverConfig)) {
        const config = MCPStdioConfigZodSchema.parse(this.serverConfig);
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          // Merge process.env with config.env, ensuring PATH is preserved and filtering out undefined values
          env: Object.entries({ ...process.env, ...config.env }).reduce(
            (acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, string>,
          ),
          cwd: process.cwd(),
        });
        this.isSSE = false;
      } else if (isMaybeSseConfig(this.serverConfig)) {
        const config = MCPSseConfigZodSchema.parse(this.serverConfig);
        const url = new URL(config.url);
        transport = new SSEClientTransport(url, {
          requestInit: {
            headers: config.headers,
          },
        });
        this.isSSE = true;
      } else {
        throw new Error("Invalid server config");
      }

      await client.connect(transport);
      
      // Add error handler that updates the connection state
      client.onerror = (err) => {
        this.log.error(err);
        this.isConnected = false;
        this.error = err;
        this.reconnectAttempts += 1;
        
        // Update global cache
        if (globalThis.__mcpClientInstances__?.has(this.name)) {
          const instance = globalThis.__mcpClientInstances__.get(this.name)!;
          instance.isConnected = false;
          instance.reconnectAttempts += 1;
        }
      };
      
      this.log.debug(
        `Connected to MCP server in ${((Date.now() - startedAt) / 1000).toFixed(2)}s`,
      );
      this.isConnected = true;
      this.error = undefined;
      this.client = client;
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      
      const toolResponse = await client.listTools();
      this.toolInfo = toolResponse.tools.map(
        (tool) =>
          ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          }) as MCPToolInfo,
      );

      // Create AI SDK tool wrappers for each MCP tool
      this.tools = toolResponse.tools.reduce((prev, _tool) => {
        const parameters = jsonSchema(
          toAny({
            ..._tool.inputSchema,
            properties: _tool.inputSchema.properties ?? {},
            additionalProperties: false,
          }),
        );
        prev[_tool.name] = tool({
          parameters,
          description: _tool.description,
          execute: (params, options: ToolExecutionOptions) => {
            options?.abortSignal?.throwIfAborted();
            return this.callTool(_tool.name, params);
          },
        });
        return prev;
      }, {});
      
      // Cache the client in global storage
      globalThis.__mcpClientInstances__?.set(this.name, {
        client,
        tools: this.tools,
        toolInfo: this.toolInfo,
        isConnected: true,
        lastUsed: Date.now(),
        reconnectAttempts: 0,
        isSSE: this.isSSE
      });
      
    } catch (error) {
      this.log.error(error);
      this.isConnected = false;
      this.error = error;
      this.reconnectAttempts += 1;
      
      // Update global cache if exists
      if (globalThis.__mcpClientInstances__?.has(this.name)) {
        const instance = globalThis.__mcpClientInstances__.get(this.name)!;
        instance.isConnected = false;
        instance.reconnectAttempts += 1;
      }
    }

    this.locker.unlock();
    return this.client;
  }
  
  async disconnect() {
    if (this.isConnected) {
      this.log.debug("Disconnecting from MCP server");
      await this.locker.wait();
      this.isConnected = false;
      const client = this.client;
      this.client = undefined;
      
      // Update the global cache
      if (globalThis.__mcpClientInstances__?.has(this.name)) {
        const instance = globalThis.__mcpClientInstances__.get(this.name)!;
        instance.isConnected = false;
      }
      
      await client?.close().catch((e) => this.log.error(e));
    }
  }
  
  async callTool(toolName: string, input?: unknown) {
    // Check if client is connected, reconnect if needed
    if (!this.isConnected || !this.client) {
      this.log.debug(`Client disconnected, reconnecting before tool call: ${toolName}`);
      await this.connect();
    }
    
    // If max reconnect attempts reached for SSE servers, throw a clearer error
    if (this.isSSE && this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      throw new Error(`Unable to connect to HTTP-based MCP server ${this.name} after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    }
    
    return safe(() => this.log.debug("tool call", toolName))
      .map(() =>
        this.client?.callTool({
          name: toolName,
          arguments: input as Record<string, unknown>,
        }),
      )
      .ifOk((v) => {
        if (isNull(v)) {
          throw new Error("Tool call failed with null");
        }
        return v;
      })
      .watch(watchError((e) => {
        this.log.error("Tool call failed", toolName, e);
        // Mark as disconnected to trigger reconnect on next call
        this.isConnected = false;
        this.reconnectAttempts += 1;
        
        // Update global cache
        if (globalThis.__mcpClientInstances__?.has(this.name)) {
          const instance = globalThis.__mcpClientInstances__.get(this.name)!;
          instance.isConnected = false;
          instance.reconnectAttempts += 1;
        }
      }))
      .unwrap();
  }
}

/**
 * Factory function to create a new MCP client
 */
export const createMCPClient = (
  name: string,
  serverConfig: MCPServerConfig,
): MCPClient => new MCPClient(name, serverConfig);
