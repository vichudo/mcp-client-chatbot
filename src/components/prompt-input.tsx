"use client";

import { cn } from "lib/utils";
import { Check, CornerRightUp, Paperclip, Pause } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { Button } from "ui/button";
import { notImplementedToast } from "ui/shared-toast";
import { PastesContentCard } from "./pasts-content";
import { UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { customModelProvider } from "lib/ai/models";

import { McpListCombo } from "./mcp-list-combo";
import { createMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { ChatMessageAnnotation } from "app-types/chat";
import dynamic from "next/dynamic";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  append: UseChatHelpers["append"];
  threadId: string;
  isLoading?: boolean;
}

const MentionInput = dynamic(() => import("./mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder = "What do you want to know?",
  threadId,
  append,
  input,
  setInput,
  onStop,
  isLoading,
}: PromptInputProps) {
  const [appStoreMutate, model, activeTool, mcpList] = appStore(
    useShallow((state) => [
      state.mutate,
      state.model,
      state.activeTool,
      state.mcpList,
    ]),
  );

  const [toolMentionItems, setToolMentionItems] = useState<
    { id: string; label: ReactNode }[]
  >([]);

  const modelList = useMemo(() => {
    return customModelProvider.modelsInfo;
  }, []);

  const [pastedContents, setPastedContents] = useState<string[]>([]);

  const toolList = useMemo(() => {
    return mcpList
      .filter((mcp) => mcp.status === "connected")
      .flatMap((mcp) => [
        {
          id: mcp.name,
          label: mcp.name,
        },
        ...mcp.toolInfo.map((tool) => {
          const id = createMCPToolId(mcp.name, tool.name);
          return {
            id,
            label: id,
          };
        }),
      ]);
  }, [mcpList]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    if (text.length > 500) {
      setPastedContents([...pastedContents, text]);
      e.preventDefault();
    }
  };

  const submit = () => {
    const userMessage = input?.trim() || "";

    const pastedContentsParsed = pastedContents.map((content) => ({
      type: "text" as const,
      text: content,
    }));

    if (userMessage.length === 0 && pastedContentsParsed.length === 0) {
      return;
    }

    const chatPath = `/chat/${threadId}`;
    if (window.location.pathname !== chatPath) {
      window.history.replaceState({}, "", chatPath);
    }

    const annotations: ChatMessageAnnotation[] = [];
    if (toolMentionItems.length > 0) {
      annotations.push({
        requiredTools: toolMentionItems.map((item) => item.id),
      });
    }
    setPastedContents([]);
    setToolMentionItems([]);
    setInput("");
    append!({
      role: "user",
      content: "",
      annotations,
      parts: [
        ...pastedContentsParsed,
        {
          type: "text",
          text: userMessage,
        },
      ],
    });
  };

  return (
    <div className="max-w-3xl mx-auto fade-in animate-in">
      <div className="z-10 mx-auto w-full max-w-3xl relative">
        <fieldset className="flex w-full min-w-0 max-w-full flex-col px-2">
          <div className="rounded-4xl backdrop-blur-sm transition-all duration-200 bg-muted/40 relative flex w-full flex-col cursor-text z-10 border items-stretch focus-within:border-muted-foreground hover:border-muted-foreground p-3">
            <div className="flex flex-col gap-3.5 px-1">
              <div className="relative min-h-[2rem]">
                <MentionInput
                  input={input}
                  onChange={setInput}
                  onChangeMention={setToolMentionItems}
                  onEnter={submit}
                  placeholder={placeholder}
                  onPaste={handlePaste}
                  items={toolList}
                />
              </div>
              <div className="flex w-full items-center gap-2">
                {pastedContents.map((content, index) => (
                  <PastesContentCard
                    key={index}
                    initialContent={content}
                    deleteContent={() => {
                      setPastedContents((prev) => {
                        const newContents = [...prev];
                        newContents.splice(index, 1);
                        return newContents;
                      });
                    }}
                    updateContent={(content) => {
                      setPastedContents((prev) => {
                        const newContents = [...prev];
                        newContents[index] = content;
                        return newContents;
                      });
                    }}
                  />
                ))}
              </div>
              <div className="flex w-full items-center z-30">
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer"
                  onClick={notImplementedToast}
                >
                  <Paperclip />
                </Button>

                <SelectModel
                  onSelect={(model) => {
                    appStoreMutate({ model });
                  }}
                  providers={modelList}
                  model={model}
                >
                  <Button size={"sm"} variant={"ghost"}>
                    {model}
                  </Button>
                </SelectModel>
                <div className="flex-1" />
                <McpListCombo>
                  <Button
                    variant={activeTool ? "secondary" : "ghost"}
                    className={cn(
                      !activeTool && "text-muted-foreground",
                      "font-semibold mr-1 rounded-full",
                    )}
                  >
                    {activeTool && <Check size={3.5} />}
                    tools
                  </Button>
                </McpListCombo>
                <Button
                  onClick={() => {
                    if (isLoading) {
                      onStop();
                    } else {
                      submit();
                    }
                  }}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    input.length > 0
                      ? "text-foreground"
                      : "text-muted-foreground",
                    "cursor-pointer rounded-xl",
                  )}
                >
                  {isLoading ? (
                    <Pause
                      size={16}
                      className="fill-muted-foreground text-muted-foreground"
                    />
                  ) : (
                    <CornerRightUp size={16} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
