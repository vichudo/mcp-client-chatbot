"use client";
import { MCPToolInfo } from "app-types/mcp";
import { PropsWithChildren } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Separator } from "ui/separator";
import JsonView from "ui/json-view";

// Helper function to check if schema is empty
const isEmptySchema = (schema: any): boolean => {
  if (!schema) return true;
  // Check properties first if available, otherwise check the schema itself
  const dataToCheck = schema.properties || schema;
  return Object.keys(dataToCheck).length === 0;
};

export const ToolDetailPopup = ({
  tool,
  children,
}: PropsWithChildren<{ tool: MCPToolInfo }>) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <DialogContent className="sm:max-w-[800px] fixed p-10 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{tool.name}</DialogTitle>
          </DialogHeader>
          <div className="mb-2">
            <p
              aria-describedby="tool-description"
              className="text-xs text-muted-foreground mt-1 max-h-[150px] overflow-y-auto"
            >
              {tool.description}
            </p>
          </div>

          <Separator className="my-2" />

          <div className="flex items-center gap-2 mb-2">
            <h5 className="text-xs font-medium">Input Schema</h5>
          </div>
          {tool.inputSchema ? (
            <div className="overflow-y-auto max-h-[40vh]">
              {!isEmptySchema(tool.inputSchema) ? (
                <JsonView
                  data={tool.inputSchema?.properties || tool.inputSchema}
                />
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No data available
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No schema available
            </p>
          )}

          <div className="absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
