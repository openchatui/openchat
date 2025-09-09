"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Mic,
  Globe,
  Image as ImageIcon,
  Terminal,
  AudioWaveform,
} from "lucide-react";

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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

  return (
    <div className="bg-transparent">
      <form
        onSubmit={handleSubmit}
        className={cn("max-w-6xl px-2.5 p-6 mx-auto inset-x-0", className)}
      >
        <div className="rounded-3xl bg-accent p-2">
          {/* Top row: input */}
          <div className="flex items-center px-2 bg-transparent">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onInput={resizeTextarea}
              placeholder={placeholder}
              disabled={disabled}
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
                label="Web Search"
              />
              <Pill
                active={image}
                onClick={() => setImage((v) => !v)}
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                label="Image"
              />
              <Pill
                active={codeInterpreter}
                onClick={() => setCodeInterpreter((v) => !v)}
                icon={<Terminal className="h-3.5 w-3.5" />}
                label="Code Interpreter"
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
              <Button
                type="submit"
                size="icon"
                className={cn(
                  "rounded-full h-10 w-10 bg-white text-black hover:bg-white/90 dark:bg-white dark:text-black"
                )}
                aria-label="Send message"
                disabled={disabled || !value.trim()}
              >
                <AudioWaveform className="h-5 w-5" />
              </Button>
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "rounded-full h-7 px-3 gap-2",
        active && "border-primary text-primary bg-primary/10"
      )}
      aria-pressed={active}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}

export default ChatInput;
