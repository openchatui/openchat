"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Plus,
  Mic,
  Globe,
  Image as ImageIcon,
  Terminal,
  AudioWaveform,
  ArrowUp,
} from "lucide-react";

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  isStreaming?: boolean;
  onStop?: () => void;
  onSubmit?: (
    value: string,
    options: {
      webSearch: boolean;
      image: boolean;
      codeInterpreter: boolean;
    }
  ) => void;
}

export function ChatInput({
  placeholder = "Send a Message",
  disabled,
  className,
  isStreaming = false,
  onStop,
  onSubmit,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [webSearch, setWebSearch] = useState(true);
  const [image, setImage] = useState(false);
  const [codeInterpreter, setCodeInterpreter] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea as content grows (with a sensible max height)
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 256; // 16rem cap
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  };

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed, { webSearch, image, codeInterpreter });
    setValue("");
    requestAnimationFrame(resizeTextarea);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <div className="bg-background mx-4 ">
      <form
        onSubmit={handleSubmit}
        className={cn("max-w-6xl px-2.5 pb-6 pt-0 mx-auto inset-x-0", className)}
      >
        <div className="rounded-3xl bg-accent p-2 shadow-md">
          {/* Top row: input */}
          <div className="flex items-center px-2 bg-transparent">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onInput={resizeTextarea}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled && !isStreaming}
              id="input"
              name="input"
              rows={1}
              className={cn(
                "min-h-12 max-h-72 resize-none overflow-y-auto",
                "border-0 bg-accent dark:bg-accent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
              ,
              // Increase font size ~2pt (~2.67px)
              "text-[16px] md:text-[16px]")}
            />
          </div>

          {/* Bottom row: left pills and right actions */}
          <div className="mt-1 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Open actions"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Pill
                active={webSearch}
                onClick={() => setWebSearch((v) => !v)}
                icon={<Globe className="h-3.5 w-3.5" />}
                label="Web search"
              />
              <Pill
                active={image}
                onClick={() => setImage((v) => !v)}
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                label="Image input"
              />
              <Pill
                active={codeInterpreter}
                onClick={() => setCodeInterpreter((v) => !v)}
                icon={<Terminal className="h-3.5 w-3.5" />}
                label="Code interpreter"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Start voice input"
              >
                <Mic className="h-5 w-5" />
              </Button>
              {isStreaming ? (
                <Button
                  type="button"
                  size="icon"
                  onClick={onStop}
                  className={cn(
                    "rounded-full h-9 w-9 bg-white text-black hover:bg-white/90 dark:bg-white dark:text-black"
                  )}
                  aria-label="Stop generation"
                >
                  {/* Square icon to represent stop */}
                  <div className="h-3 w-3 bg-current rounded-[2px]" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  className={cn(
                    "rounded-full h-9 w-9 bg-white text-black hover:bg-white/90 dark:bg-white dark:text-black"
                  )}
                  aria-label="Send message"
                  disabled={disabled || !value.trim()}
                >
                  {value.trim() ? (
                    <ArrowUp className="h-5 w-5" />
                  ) : (
                    <AudioWaveform className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Pill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClick}
          className={cn(
            "rounded-full h-7 px-3 gap-0",
            active && "border-primary text-primary bg-primary/10"
          )}
          aria-pressed={active}
          aria-label={label || "Toggle"}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      {!!label && (
        <TooltipContent side="top" sideOffset={6}>
          {label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export default ChatInput;
