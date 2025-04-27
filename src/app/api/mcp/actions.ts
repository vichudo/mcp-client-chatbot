"use server";

import type { MCPServerConfig } from "app-types/mcp";
import { mcpClientsManager } from "./mcp-manager";
import { isMaybeMCPServerConfig } from "lib/ai/mcp/is-mcp-config";
import { detectConfigChanges } from "lib/ai/mcp/mcp-config-diff";

export async function selectMcpClientsAction() {
  const servers = await mcpClientsManager.getServers();
  return servers;
}

export async function selectMcpClientAction(name: string) {
  try {
    const client = await mcpClientsManager.getClient(name);
    return client.getInfo();
  } catch (error) {
    throw new Error("Client not found");
  }
}

const validateConfig = (config: unknown) => {
  if (!isMaybeMCPServerConfig(config)) {
    throw new Error("Invalid MCP server configuration");
  }
  return config;
};

export async function updateMcpConfigByJsonAction(
  json: Record<string, MCPServerConfig>,
) {
  Object.values(json).forEach(validateConfig);
  
  // Get current configs
  const servers = await mcpClientsManager.getServers();
  const prevConfig = Object.fromEntries(
    servers.map((server) => [server.name, server.config]),
  );
  
  // Find changes
  const changes = detectConfigChanges(prevConfig, json);
  
  // Apply changes
  for (const change of changes) {
    const value = change.value;
    if (change.type === "add") {
      await insertMcpClientAction(change.key, value);
    } else if (change.type === "remove") {
      await removeMcpClientAction(change.key);
    } else if (change.type === "update") {
      await updateMcpClientAction(change.key, value);
    }
  }
}

export async function insertMcpClientAction(
  name: string,
  config: MCPServerConfig,
) {
  const client = await mcpClientsManager.getClient(name);
  return client.getInfo();
}

export async function removeMcpClientAction(name: string) {
  await mcpClientsManager.removeClient(name);
}

export async function connectMcpClientAction(name: string) {
  await mcpClientsManager.getClient(name);
}

export async function disconnectMcpClientAction(name: string) {
  await mcpClientsManager.removeClient(name);
}

export async function refreshMcpClientAction(name: string) {
  // Get fresh client
  await mcpClientsManager.removeClient(name);
  await mcpClientsManager.getClient(name);
}

export async function updateMcpClientAction(
  name: string,
  config: MCPServerConfig,
) {
  // Remove and re-add with new config
  await mcpClientsManager.removeClient(name);
  const client = await mcpClientsManager.getClient(name);
  return client.getInfo();
}

export async function callMcpToolAction(
  mcpName: string,
  toolName: string,
  input?: unknown,
) {
  try {
    const client = await mcpClientsManager.getClient(mcpName);
    return client.callTool(toolName, input).then((res) => {
      if (res?.isError) {
        throw new Error(
          res.content?.[0]?.text ??
            JSON.stringify(res.content, null, 2) ??
            "Unknown error",
        );
      }
      return res;
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error';
    throw new Error(`Error calling tool: ${errorMessage}`);
  }
}
