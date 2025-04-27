// Pre-compiled JS version of the database URL assistant MCP server for Vercel
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Handle process errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in database-url MCP server:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in database-url MCP server:', promise, 'reason:', reason);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down database-url MCP server gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down database-url MCP server gracefully');
  process.exit(0);
});

const server = new McpServer({
  name: "database-url-assistant",
  version: "0.0.1",
});

// Helper function to get Turso connection info safely
function getTursoInfo() {
  try {
    // Parse the URL to ensure it's well-formatted
    let dbUrl = process.env.TURSO_SYNC_URL || "Not available";
    let authToken = process.env.TURSO_AUTH_TOKEN ? "Available" : "Not available";
    
    // Remove any https:// or http:// prefix for display
    if (dbUrl.startsWith("http")) {
      dbUrl = dbUrl.replace(/^https?:\/\//, "libsql://");
    }
    
    return {
      url: dbUrl,
      authToken: authToken,
      environment: process.env.NODE_ENV || "development",
      vercel: process.env.VERCEL === "1" ? "Yes" : "No"
    };
  } catch (error) {
    console.error("Error getting database info:", error);
    return {
      url: "Error retrieving URL",
      authToken: "Error retrieving token",
      environment: process.env.NODE_ENV || "development",
      error: error.message
    };
  }
}

server.tool(
  "get_database_url",
  "Get database connection information",
  {},
  async () => {
    try {
      const dbInfo = getTursoInfo();
      
      return {
        content: [
          {
            type: "text",
            text: `Database URL: ${dbInfo.url}`,
          },
          {
            type: "text", 
            text: `Auth Token: ${dbInfo.authToken}`,
          },
          {
            type: "text", 
            text: `Environment: ${dbInfo.environment}`,
          },
          {
            type: "text", 
            text: `Vercel: ${dbInfo.vercel}`,
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

// Keep track of connection state
let connected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Connection function with retry logic
function connectWithRetry() {
  server.connect(transport)
    .then(() => {
      connected = true;
      reconnectAttempts = 0;
      console.log("Database URL MCP server connected successfully");
    })
    .catch(err => {
      reconnectAttempts++;
      console.error(`Error connecting database URL MCP server (attempt ${reconnectAttempts}):`, err);
      
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Retrying connection in ${delay}ms...`);
        setTimeout(connectWithRetry, delay);
      } else {
        console.error("Maximum reconnection attempts reached. Giving up.");
      }
    });
}

// Start the initial connection
connectWithRetry(); 