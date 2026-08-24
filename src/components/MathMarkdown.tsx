import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
// Registers \ce{} (chemistry) on the shared KaTeX instance used by rehype-katex.
import 'katex/contrib/mhchem';
import { prepareMathForRender, type MathRenderMode } from '@/src/lib/math-content';

function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  return '';
}

export interface MathMarkdownProps {
  content: string;
  className?: string;
  /** Use for @formula blocks — always display-size KaTeX. */
  mathMode?: MathRenderMode;
}

export const MathMarkdown = memo(function MathMarkdown({
  content,
  className,
  mathMode = 'auto',
}: MathMarkdownProps) {
  return (
    <div className={`slm-prose ${className ?? ''}`}>
      <Markdown
        remarkPlugins={[remarkMath, remarkGfm]} // math first so GFM cannot italicize A_{safe}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        urlTransform={safeUrl}
      >
        {prepareMathForRender(content, mathMode)}
      </Markdown>
    </div>
  );
});
