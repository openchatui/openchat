'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from "@/lib/utils";
import { BrainIcon, ChevronDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { createContext, memo, useContext, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import hardenReactMarkdown from 'harden-react-markdown';
import { Response } from './response';

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning');
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 0;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = false,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: 0,
    });

    const [hasAutoClosedRef, setHasAutoClosedRef] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Track duration when streaming starts and ends
    useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          setStartTime(Date.now());
        }
      } else if (startTime !== null) {
        setDuration(Math.round((Date.now() - startTime) / 1000));
        setStartTime(null);
      }
    }, [isStreaming, startTime, setDuration]);

    // Auto-open when streaming starts and reset auto-close guard for this session
    useEffect(() => {
      if (isStreaming && !isOpen) {
        setIsOpen(true);
      }
      if (isStreaming && hasAutoClosedRef) {
        setHasAutoClosedRef(false);
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosedRef]);

    // Auto-close immediately when streaming ends; don't display full thought while open
    useEffect(() => {
      if (!isStreaming && isOpen && !hasAutoClosedRef) {
        if (AUTO_CLOSE_DELAY > 0) {
          const t = setTimeout(() => {
            setIsOpen(false);
            setHasAutoClosedRef(true);
          }, AUTO_CLOSE_DELAY);
          return () => clearTimeout(t);
        } else {
          setIsOpen(false);
          setHasAutoClosedRef(true);
        }
      }
    }, [isStreaming, isOpen, hasAutoClosedRef, setIsOpen]);

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration }}
      >
        <Collapsible
          className={cn('not-prose mb-4', className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  title?: string;
};

export const ReasoningTrigger = memo(
  ({
    className,
    title = 'Reasoning',
    children,
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          'flex items-center gap-2 text-muted-foreground text-sm',
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <BrainIcon className="size-4" />
            {isStreaming ? (
              <p>Thinking...</p>
            ) : duration > 0 ? (
              <p>Thought for {duration} seconds</p>
            ) : (
              <p>Thought</p>
            )}
            <ChevronDownIcon
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                isOpen ? 'rotate-180' : 'rotate-0'
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const { isStreaming } = useReasoning();
    const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [stickBottom, setStickBottom] = useState(false);

    useEffect(() => {
      const update = () => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;
        const contentHeight = content.offsetHeight;
        const containerHeight = container.clientHeight;
        setStickBottom(contentHeight > containerHeight);
      };

      update();

      let ro: ResizeObserver | null = null;
      if (typeof window !== 'undefined' && 'ResizeObserver' in window && contentRef.current) {
        ro = new ResizeObserver(() => update());
        ro.observe(contentRef.current);
      }

      return () => {
        if (ro) ro.disconnect();
      };
    }, [children]);
    const inlineComponents = {
      p: ({ children, className, ...rest }: any) => (
        <p className={cn('my-0', className)} {...rest}>{children}</p>
      ),
      strong: ({ children, className, ...rest }: any) => (
        <span className={cn('font-semibold', className)} {...rest}>{children}</span>
      ),
      em: ({ children, className, ...rest }: any) => (
        <span className={cn('italic', className)} {...rest}>{children}</span>
      ),
      code: ({ children, className, ...rest }: any) => (
        <code className={cn('rounded bg-muted px-1 py-0.5 font-mono', className)} {...rest}>{children}</code>
      ),
      a: ({ children, className, ...rest }: any) => (
        <a className={cn('underline', className)} target="_blank" rel="noreferrer" {...rest}>{children}</a>
      ),
      h1: ({ children, className, ...rest }: any) => (
        <div className={cn('font-semibold my-0', className)} {...rest}>{children}</div>
      ),
      h2: ({ children, className, ...rest }: any) => (
        <div className={cn('font-semibold my-0', className)} {...rest}>{children}</div>
      ),
      h3: ({ children, className, ...rest }: any) => (
        <div className={cn('font-semibold my-0', className)} {...rest}>{children}</div>
      ),
      h4: ({ children, className, ...rest }: any) => (
        <div className={cn('font-semibold my-0', className)} {...rest}>{children}</div>
      ),
      h5: ({ children, className, ...rest }: any) => (
        <div className={cn('font-semibold my-0', className)} {...rest}>{children}</div>
      ),
      h6: ({ children, className, ...rest }: any) => (
        <div className={cn('font-semibold my-0', className)} {...rest}>{children}</div>
      ),
      br: (props: any) => <br {...props} />,
    } as const;
    return (
      <CollapsibleContent
        className={cn(
          'mt-4 text-sm',
          'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
          className
        )}
        {...props}
      >
        {isStreaming ? (
          <div className="relative">
            {stickBottom && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 z-20 bg-gradient-to-b from-background to-transparent" />
            )}
            <div ref={containerRef} className="relative font-mono text-xs leading-5 h-[9rem] overflow-hidden">
              <div
                ref={contentRef}
                className={cn(
                  'whitespace-pre-wrap',
                  stickBottom ? 'absolute inset-x-0 bottom-0' : 'relative'
                )}
              >
                <HardenedMarkdown components={inlineComponents as any}>
                  {children}
                </HardenedMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="font-mono text-xs leading-5 whitespace-pre-wrap">
            <HardenedMarkdown components={inlineComponents as any}>
              {children}
            </HardenedMarkdown>
          </div>
        )}
      </CollapsibleContent>
    );
  }
);

Reasoning.displayName = 'Reasoning';
ReasoningTrigger.displayName = 'ReasoningTrigger';
ReasoningContent.displayName = 'ReasoningContent';
