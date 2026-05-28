import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
// Registers \ce{} (chemistry) on the shared KaTeX instance used by rehype-katex.
import 'katex/contrib/mhchem';

/**
 * Renders markdown with embedded LaTeX (KaTeX) and GitHub-flavoured markdown.
 * Normalizes \(..\) / \[..\] delimiters to $..$ / $$..$$ so capsules using
 * either convention render correctly.
 */
function normalizeMathDelimiters(src: string): string {
  return src
    .replace(/\\\[(.+?)\\\]/gs, (_m, e) => `$$${e}$$`)
    .replace(/\\\((.+?)\\\)/gs, (_m, e) => `$${e}$`);
}

export interface MathMarkdownProps {
  content: string;
  className?: string;
}

export const MathMarkdown = memo(function MathMarkdown({ content, className }: MathMarkdownProps) {
  return (
    <div className={`slm-prose ${className ?? ''}`}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
      >
        {normalizeMathDelimiters(content)}
      </Markdown>
    </div>
  );
});
