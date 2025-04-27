// Pre-compiled JS version of the database URL assistant MCP server for Vercel
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Handle process errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const server = new McpServer({
  name: "database-url-assistant",
  version: "0.0.1",
});

server.tool(
  "get_database_url",
  "Get database connection information",
  {},
  async () => {
    try {
      // Parse the URL to ensure it's well-formatted
      let dbUrl = process.env.TURSO_SYNC_URL || "Not available";
      
      // Remove any https:// or http:// prefix for display
      if (dbUrl.startsWith("http")) {
        dbUrl = dbUrl.replace(/^https?:\/\//, "libsql://");
      }
      
      return {
        content: [
          {
            type: "text",
            text: `Database URL: ${dbUrl}`,
          },
          {
            type: "text", 
            text: `Environment: ${process.env.NODE_ENV || "development"}`,
          }
        ],
      };
    } catch (error) {
      console.error("Error getting database info:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving database information: ${error.message}`,
          },
        ],
      };
    }
  },
);

const transport = new StdioServerTransport();

server.connect(transport).catch(err => {
  console.error("Error connecting database URL MCP server:", err);
}); 