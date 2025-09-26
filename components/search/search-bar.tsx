"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SearchBarProps {
  query?: string;
  initialMentions?: string[];
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  query,
  initialMentions = [],
  placeholder = "Search or use @",
  className,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState<string>(query ?? "");
  const [mentions, setMentions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const suppressNextPropSyncRef = useRef(false);

  useEffect(() => {
    if (suppressNextPropSyncRef.current) {
      suppressNextPropSyncRef.current = false;
      return;
    }
    setValue(query ?? "");
  }, [query]);

  useEffect(() => {
    if (suppressNextPropSyncRef.current) {
      suppressNextPropSyncRef.current = false;
      return;
    }
    // Initialize mentions from server/URL on mount or when the prop changes
    setMentions(Array.isArray(initialMentions) ? initialMentions : []);
  }, [initialMentions]);

  const caretIndex = () => {
    const el = inputRef.current;
    if (!el) return value.length;
    try {
      return el.selectionStart ?? value.length;
    } catch {
      return value.length;
    }
  };

  const { tokenStart, tokenText } = useMemo(() => {
    const pos = caretIndex();
    const left = value.slice(0, pos);
    const lastSpace = Math.max(left.lastIndexOf(" "), left.lastIndexOf("\n"), left.lastIndexOf("\t"));
    const start = lastSpace + 1;
    const token = left.slice(start);
    return { tokenStart: start, tokenText: token };
  }, [value]);

  const MENTION_OPTIONS = useMemo(
    // order by colors: red, orange, amber, lime, sky, indigo
    () => ["pinned", "archived", "folder", "models", "chats", "tags"],
    []
  );

  const filtered = useMemo(() => {
    if (!tokenText.startsWith("@")) return [] as string[];
    const q = tokenText.slice(1).toLowerCase();
    return MENTION_OPTIONS.filter((o) => o.toLowerCase().startsWith(q));
  }, [tokenText, MENTION_OPTIONS]);

  useEffect(() => {
    setOpen(filtered.length > 0);
    setHighlightIndex(0);
  }, [filtered]);

  const selectOption = (opt: string) => {
    const el = inputRef.current;
    const pos = caretIndex();
    const before = value.slice(0, tokenStart);
    const after = value.slice(pos);
    // Add selected mention as a badge and remove the inline token from input value
    setMentions((prev) => (prev.includes(opt) ? prev : [...prev, opt]));
    const next = (before + after).replace(/^\s+/, "");
    setValue(next);
    setOpen(false);
    // move caret to end of inserted token
    requestAnimationFrame(() => {
      if (el) {
        const newPos = (before + after).length - after.length;
        try {
          el.setSelectionRange(newPos, newPos);
          el.focus();
        } catch {}
      }
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % filtered.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opt = filtered[highlightIndex];
        if (opt) selectOption(opt);
        return;
      } else if (e.key === " ") {
        // Space confirms an exact mention token
        const exact = tokenText.startsWith("@") ? tokenText.slice(1).toLowerCase() : "";
        if (exact && MENTION_OPTIONS.includes(exact)) {
          e.preventDefault();
          selectOption(exact);
          return;
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    // Delete last badge when input is empty (or caret at start) and Backspace is pressed
    if (e.key === "Backspace" && (value.length === 0 || caretIndex() === 0) && mentions.length > 0) {
      setMentions((prev) => prev.slice(0, -1));
      e.preventDefault();
    }
  };

  // Debounced dynamic search: update the URL as the user types or changes mentions
  useEffect(() => {
    // If the user is currently typing an @-mention token (not yet a full option),
    // do not initiate or update the search.
    const hasActiveMentionToken =
      tokenText.startsWith("@") &&
      !MENTION_OPTIONS.includes(tokenText.slice(1).toLowerCase());

    if (hasActiveMentionToken) return;

    const params = new URLSearchParams(sp?.toString());
    const currentQ = params.get("q") || "";
    const currentMentions = new Set((sp ? sp.getAll("mention") : []).map((m) => String(m).toLowerCase()));

    // Extract fully-typed mentions from free text (exact option matches only)
    const extractedFromValue = (() => {
      const found = new Set<string>();
      const regex = /(^|\s)@(\w+)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(value)) !== null) {
        const w = (match[2] || '').toLowerCase();
        if (MENTION_OPTIONS.includes(w)) found.add(w);
      }
      return Array.from(found);
    })();
    const combinedMentions = Array.from(new Set([...(mentions || [])].concat(extractedFromValue))).map(m => m.toLowerCase());

    // Remove fully-typed mentions from query text
    const desiredQ = (() => {
      let text = value || '';
      for (const m of combinedMentions) {
        const pat = new RegExp(`(^|\\s)@${m}(?=\\b)`, 'gi');
        text = text.replace(pat, ' ');
      }
      return text.trim();
    })();

    const desiredMentions = new Set(combinedMentions);
    const mentionsEqual = currentMentions.size === desiredMentions.size && [...currentMentions].every((m) => desiredMentions.has(m));
    const qEqual = currentQ === desiredQ;
    if (qEqual && mentionsEqual) return;

    const handle = setTimeout(() => {
      const next = new URLSearchParams(params);
      next.delete("mention");
      // Mentions always reflect combined (extracted + selected) mentions
      combinedMentions.forEach((m) => next.append("mention", m));
      // Only set q when there is non-mention text
      if (desiredQ) next.set("q", desiredQ); else next.delete("q");
      const qs = next.toString();
      // Prevent the incoming server-prop update from overriding local typing
      suppressNextPropSyncRef.current = true;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 450);
    return () => clearTimeout(handle);
  }, [value, mentions, pathname, router, sp, tokenText]);

  return (
    <div className={cn("w-full", className)}>
      <form action="/search" method="GET" className="w-full">
        <div className="rounded-full bg-accent p-2 shadow-md">
          <div
            className="flex items-center gap-2 relative flex-wrap mx-2"
            onClick={() => inputRef.current?.focus()}
          >
            {/* include mentions as hidden inputs for GET submission */}
            {mentions.map((m) => (
              <input key={`hidden-${m}`} type="hidden" name="mention" value={m}/>
            ))}
            {/* render selected mentions as badges in the same color order */}
            {[...mentions]
              .sort((a, b) => MENTION_OPTIONS.indexOf(a) - MENTION_OPTIONS.indexOf(b))
              .map((m) => (
              <Badge key={m} variant="secondary" className={cn("rounded-full", badgeColorClass(m))}>
                @{m}
              </Badge>
            ))}
            <Input
              ref={inputRef}
              name="q"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={mentions.length ? "" : placeholder}
              autoComplete="off"
              className={cn(
                // make input behave like inline text alongside badges
                "h-8 border-0 bg-transparent dark:bg-transparent shadow-none flex-1 min-w-[6rem] px-0",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "text-[16px] md:text-[16px]"
              )}
            />
            {open && (
              <div
                className={cn(
                  "absolute left-2 right-2 top-full mt-1 z-50",
                  "rounded-md border bg-popover text-popover-foreground shadow-md"
                )}
              >
                <ul className="py-1 text-sm">
                  {filtered.map((opt, idx) => (
                    <li key={opt}>
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-1.5",
                          idx === highlightIndex
                            ? "bg-accent text-foreground"
                            : "hover:bg-accent/70"
                        )}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectOption(opt);
                        }}
                      >
                        <Badge variant="secondary" className={cn("rounded-full", badgeColorClass(opt))}>@{opt}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function badgeColorClass(opt: string): string {
  switch (opt) {
    case "chats":
      return "bg-sky-200 text-black border-sky-200 dark:bg-sky-200 dark:text-black dark:border-sky-200";
    case "tags":
      return "bg-indigo-200 text-black border-indigo-200 dark:bg-indigo-200 dark:text-black dark:border-indigo-200";
    case "folder":
      return "bg-amber-200 text-black border-amber-200 dark:bg-amber-200 dark:text-black dark:border-amber-200";
    case "pinned":
      return "bg-red-200 text-black border-red-200 dark:bg-red-200 dark:text-black dark:border-red-200";
    case "archived":
      return "bg-orange-200 text-black border-orange-200 dark:bg-orange-200 dark:text-black dark:border-orange-200";
    case "model":
    case "models":
      return "bg-lime-200 text-black border-lime-200 dark:bg-lime-200 dark:text-black dark:border-lime-200";
    default:
      return "";
  }
}

export default SearchBar;


