"use client"

import { useState } from 'react'
import { cn } from "@/lib/utils";
import { Loader } from '@/components/ui/loader'
export type ImageProps = {
  className?: string;
  alt?: string;
  src?: string; // Prefer URL when available to avoid embedding base64 in chat context
  // Optional base64 fallback when a URL is not available
  base64?: string;
  mediaType?: string;
  uint8Array?: Uint8Array;
};

export const Image = ({
  base64,
  uint8Array,
  mediaType,
  src,
  ...props
}: ImageProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const resolvedSrc = typeof src === 'string' && src.length > 0
    ? src
    : `data:${mediaType};base64,${base64}`;
  return (
    <div className={cn('', props.className)}>
      {isLoading && (
        <div className="flex items-center justify-center w-full h-[200px] max-h-full bg-muted/30 rounded-md">
          <Loader className="h-4 w-4" />
        </div>
      )}
      <img
        {...props}
        alt={props.alt}
        className={cn(
          'h-auto max-w-full overflow-hidden rounded-md',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        src={resolvedSrc}
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
    </div>
  );
};
