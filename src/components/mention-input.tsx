"use client";

import { useEditor, EditorContent, UseEditorOptions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Mention } from "@tiptap/extension-mention";
import React, {
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useRef,
  useCallback,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { useLatest } from "@/hooks/use-latest";
import { cn } from "@/lib/utils";
import { fuzzySearch } from "@/lib/fuzzy-search";

interface MentionInputProps {
  input?: string;
  onChange?: (value: string) => void;
  onChangeMention?: (mentionItems: { id: string; label: ReactNode }[]) => void;
  onEnter?: () => void;
  placeholder?: string;
  items?: { id: string; label: string }[];
  onPaste?: (e: React.ClipboardEvent) => void;
}

export default function MentionInput({
  input,
  onChange,
  onChangeMention,
  onEnter,
  placeholder = "Type a message...",
  onPaste,
  items = [],
}: MentionInputProps) {
  const [suggestion, setSuggestion] = useState<{
    top: number;
    left: number;
    query: string;
    selectedIndex: number;
    command: (item: { id: string; label: string }) => void;
  } | null>(null);

  const mentionRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    if (!suggestion?.query || !items.length) return items;
    return fuzzySearch(items, suggestion.query);
  }, [suggestion?.query, items]);

  const latestRef = useLatest({ suggestion, filteredItems });

  // Memoize editor configuration
  const editorConfig = useMemo<UseEditorOptions>(
    () => ({
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            char: "@",
            items: ({ query }: { query: string }) => {
              return items;
            },
            render: () => {
              return {
                onStart: (props) => {
                  const rect = props.clientRect?.();
                  if (rect) {
                    setSuggestion({
                      top: rect.top - +window.scrollY,
                      left: rect.left - +window.scrollX,
                      query: props.query,
                      selectedIndex: 0,
                      command: props.command,
                    });
                  }
                },
                onUpdate: (props: any) => {
                  setSuggestion((prev) =>
                    prev
                      ? {
                          ...prev,
                          query: props.query,
                          command: props.command,
                        }
                      : null,
                  );
                },
                onKeyDown(props) {
                  const key = props.event.key;
                  const allowedKeys = [
                    "Enter",
                    "Tab",
                    "ArrowUp",
                    "ArrowDown",
                    "Escape",
                  ];
                  if (!allowedKeys.includes(key)) return false;
                  props.event.preventDefault();
                  props.event.stopPropagation();

                  const suggestion = latestRef.current.suggestion!;
                  const filteredItems = latestRef.current.filteredItems;

                  if (key === "Escape") {
                    setSuggestion(null);
                  } else if (key === "Enter" || key === "Tab") {
                    const commandItem = filteredItems[suggestion.selectedIndex];
                    if (commandItem) {
                      suggestion.command(commandItem);
                    }
                  } else if (key === "ArrowUp" || key === "ArrowDown") {
                    const newIndex =
                      suggestion.selectedIndex + (key === "ArrowUp" ? -1 : 1);
                    setSuggestion((prev) => ({
                      ...prev!,
                      selectedIndex: Math.max(
                        0,
                        Math.min(newIndex, filteredItems.length - 1),
                      ),
                    }));
                  }
                  return true;
                },
                onExit: (props) => {
                  const mentionItems =
                    props.editor?.$doc.element.querySelectorAll(
                      "[data-type='mention']",
                    );
                  const mentionItemsArray = Array.from(mentionItems).map(
                    (item) => ({
                      id: item.getAttribute("data-id")!,
                      label: item.textContent!,
                    }),
                  );
                  onChangeMention?.(mentionItemsArray);
                  setSuggestion(null);
                },
              };
            },
          },
        }),
      ],
      content: input,
      autofocus: true,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getText());
      },
      editorProps: {
        handlePaste: (_, e) => {
          const text = e.clipboardData?.getData("text/plain") ?? "";
          return text.length > 500;
        },
        attributes: {
          class:
            "w-full max-h-80 min-h-[2rem] break-words overflow-y-auto resize-none focus:outline-none px-2 py-1 prose prose-sm dark:prose-invert",
        },
      },
    }),
    [items, input, onChange, onChangeMention, latestRef],
  );

  const editor = useEditor(editorConfig);

  // Memoize handlers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isSubmit =
        !suggestion &&
        e.key === "Enter" &&
        editor?.getText().trim().length &&
        !e.shiftKey &&
        !e.nativeEvent.isComposing;
      if (isSubmit) {
        onEnter?.();
      }
    },
    [suggestion, editor, onEnter],
  );

  // Reset selectedIndex when filteredItems change
  useEffect(() => {
    if (suggestion) {
      setSuggestion((prev) => ({
        ...prev!,
        selectedIndex: 0,
      }));
    }
  }, [filteredItems]);

  // Sync input prop with editor content
  useEffect(() => {
    if (input?.trim() !== editor?.getText().trim()) {
      editor?.commands.setContent(input || "");
    }
  }, [input, editor]);

  // Handle outside clicks to close suggestion
  useEffect(() => {
    if (!suggestion) return;

    const handleClick = (e: MouseEvent) => {
      if (
        !mentionRef.current?.contains(e.target as Node) &&
        !editor?.isActive("mention")
      ) {
        setSuggestion(null);
      }
    };

    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [suggestion, editor]);

  // Memoize the DOM structure
  const suggestionPortal = useMemo(() => {
    if (!suggestion) return null;

    return createPortal(
      <div
        className="fixed z-50"
        style={{
          top: suggestion.top,
          left: suggestion.left,
        }}
      >
        <div
          ref={mentionRef}
          className="translate-y-[-100%] flex flex-col bg-background border rounded-md shadow-md w-[280px] px-2 py-2 gap-1 max-h-[400px] overflow-y-auto z-50"
        >
          <MentionSelect
            items={filteredItems}
            query={suggestion.query}
            addMention={suggestion.command}
            selectedIndex={suggestion.selectedIndex}
          />
        </div>
      </div>,
      document.body,
    );
  }, [suggestion, filteredItems, mentionRef]);

  const placeholderElement = useMemo(() => {
    if (!editor?.isEmpty) return null;

    return (
      <div className="absolute top-1 left-2 text-muted-foreground pointer-events-none">
        {placeholder}
      </div>
    );
  }, [editor?.isEmpty, placeholder]);

  return (
    <div className="relative w-full">
      <EditorContent
        editor={editor}
        onPaste={onPaste}
        onKeyDown={handleKeyDown}
        className="relative"
      />
      {suggestionPortal}
      {placeholderElement}
    </div>
  );
}

// Memoize HighlightText for better performance
const HighlightText = memo(function HighlightText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  // Memoize the text processing
  const textParts = useMemo(() => {
    const cleanQuery = query.toLowerCase().replace(/[^\w]/g, "");
    const uniqueChars = [...new Set(cleanQuery)].join("");

    if (!uniqueChars) return [{ text, highlight: false }];

    type TextPart = {
      text: string;
      highlight: boolean;
    };

    const parts: TextPart[] = [];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isMatch = uniqueChars.toLowerCase().includes(char.toLowerCase());

      if (isMatch) {
        if (i > lastIndex) {
          parts.push({
            text: text.substring(lastIndex, i),
            highlight: false,
          });
        }

        parts.push({
          text: char,
          highlight: true,
        });

        lastIndex = i + 1;
      }
    }

    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        highlight: false,
      });
    }

    return parts;
  }, [text, query]);

  return (
    <span>
      {textParts.map((part, i) => (
        <span
          key={i}
          className={part.highlight ? "text-blue-500 font-bold" : ""}
        >
          {part.text}
        </span>
      ))}
    </span>
  );
});

// Memoize the MentionItem component
const MentionItem = memo(function MentionItem({
  item,
  query,
  addMention,
  isSelected,
}: {
  item: { id: string; label: string };
  addMention: (item: { id: string; label: string }) => void;
  isSelected: boolean;
  query: string;
}) {
  const handleClick = useCallback(() => {
    addMention(item);
  }, [addMention, item]);

  return (
    <div
      className={cn(
        "px-3 py-2 cursor-pointer hover:bg-card text-xs rounded",
        isSelected && "bg-card",
      )}
      onClick={handleClick}
    >
      <HighlightText text={item.label} query={query} />
    </div>
  );
});

// Memoize the MentionSelect component
const MentionSelect = memo(function MentionSelect({
  items,
  query,
  addMention,
  selectedIndex,
}: {
  items: { id: string; label: string }[];
  query: string;
  addMention: (item: { id: string; label: string }) => void;
  selectedIndex: number;
}) {
  const emptyMessage = useMemo(() => {
    if (items.length > 0) return null;

    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        No results found
      </div>
    );
  }, [items.length]);

  return (
    <div>
      {emptyMessage}
      {items.map((item, index) => (
        <MentionItem
          key={item.id}
          item={item}
          query={query}
          addMention={addMention}
          isSelected={index === selectedIndex}
        />
      ))}
    </div>
  );
});
