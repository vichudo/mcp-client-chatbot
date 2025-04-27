// Pre-compiled JS version of the database URL assistant MCP server for Vercel
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "database-url-assistant",
  version: "0.0.1",
});

server.tool(
  "get_database_url",
  "Get database connection information",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: `Database URL: ${process.env.TURSO_SYNC_URL || "Not available"}`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();

server.connect(transport).catch(console.error); 