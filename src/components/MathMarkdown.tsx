import { memo } from 'react';
import Markdown, { type Components } from 'react-markdown';
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

/** A table wider than the column scrolls inside its own box, which fades on the side that has more. */
const BLOCK_COMPONENTS: Components = {
  table: ({ node: _node, ...props }) => (
    <div className="slm-table-scroll">
      <table {...props} />
    </div>
  ),
};

export interface MathMarkdownProps {
  content: string;
  className?: string;
  /** Use for @formula blocks — always display-size KaTeX. */
  mathMode?: MathRenderMode;
  /** Keep prose and math inside a heading without nested block elements. */
  inline?: boolean;
  /**
   * Pass `false` for the student's own words (their question). Math they marked up still
   * renders (`$…$`, `\(…\)`, a TeX command such as `\vec{P}`), but bare text such as
   * `A-B 4` or `x_1 = 5` is shown exactly as typed.
   */
  promote?: boolean;
}

export const MathMarkdown = memo(function MathMarkdown({
  content,
  className,
  mathMode = 'auto',
  inline = false,
  promote = true,
}: MathMarkdownProps) {
  const Wrapper = inline ? 'span' : 'div';
  return (
    <Wrapper className={`slm-prose ${className ?? ''}`}>
      <Markdown
        remarkPlugins={[remarkMath, remarkGfm]} // math first so GFM cannot italicize A_{safe}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: false }]]}
        urlTransform={safeUrl}
        components={inline ? { p: 'span' } : BLOCK_COMPONENTS}
      >
        {prepareMathForRender(content, mathMode, true, promote)}
      </Markdown>
    </Wrapper>
  );
});
