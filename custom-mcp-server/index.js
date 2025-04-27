// Pre-compiled JS version of the MCP server for Vercel
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Handle process errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in MCP server:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in MCP server:', promise, 'reason:', reason);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down MCP server gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down MCP server gracefully');
  process.exit(0);
});

const server = new McpServer({
  name: "custom-mcp-server",
  version: "0.0.1",
});

server.tool(
  "get_weather",
  "Get the current weather at a location.",
  {
    latitude: z.number(),
    longitude: z.number(),
  },
  async ({ latitude, longitude }) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
      );
      
      if (!response.ok) {
        throw new Error(`Weather API returned status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `The current temperature in ${latitude}, ${longitude} is ${data.current.temperature_2m}°C.`,
          },
          {
            type: "text",
            text: `The sunrise in ${latitude}, ${longitude} is ${data.daily.sunrise[0]} and the sunset is ${data.daily.sunset[0]}.`,
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching weather data: ${error.message}`,
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
      console.log("MCP server connected successfully");
    })
    .catch(err => {
      reconnectAttempts++;
      console.error(`Error connecting MCP server (attempt ${reconnectAttempts}):`, err);
      
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