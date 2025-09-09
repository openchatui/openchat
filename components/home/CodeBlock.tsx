'use client';

import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockFilename,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockBody,
} from '@/components/ui/code-block';
import type { BundledLanguage } from 'shiki';

interface CodeBlockProps {
  filename?: string;
  language: BundledLanguage;
  code: string;
  showHeader?: boolean;
}

export default function CustomCodeBlock({ filename, language, code, showHeader = true }: CodeBlockProps) {
  return (
    <CodeBlock defaultValue={language}>
      {showHeader && (
        <CodeBlockHeader>
          {filename && (
            <CodeBlockFilename value={language}>
              {filename}
            </CodeBlockFilename>
          )}
          <CodeBlockCopyButton />
        </CodeBlockHeader>
      )}
      <CodeBlockBody value={language}>
        <CodeBlockContent language={language}>
          {code}
        </CodeBlockContent>
      </CodeBlockBody>
    </CodeBlock>
  );
}