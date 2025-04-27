// Pre-compiled JS version of the MCP server for Vercel
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

server.connect(transport).catch(err => {
  console.error("Error connecting MCP server:", err);
}); 