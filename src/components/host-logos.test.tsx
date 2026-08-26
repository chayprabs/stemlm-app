import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import { ChatGptLogo, ClaudeLogo, GeminiLogo, GrokLogo, HostLogo } from './host-logos';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function render(node: ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('host logos', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('ships the official ChatGPT bloom, Claude asterisk, Gemini spark, and Grok 2025 mark', () => {
    const chatgpt = render(<ChatGptLogo />);
    expect(chatgpt.container.innerHTML).toContain('M22.2819 9.8211');
    expect(chatgpt.container.innerHTML).not.toContain('M12.9 2.4');
    chatgpt.unmount();

    const claude = render(<ClaudeLogo />);
    expect(claude.container.innerHTML).toContain('m4.7144 15.9555');
    expect(claude.container.innerHTML).toContain('#D97757');
    expect(claude.container.innerHTML).not.toContain('M11.15 2.2h1.7');
    claude.unmount();

    const gemini = render(<GeminiLogo />);
    expect(gemini.container.innerHTML).toContain('linearGradient');
    expect(gemini.container.innerHTML).toContain('#1A73E8');
    expect(gemini.container.innerHTML).toContain('M11.04 19.32');
    expect(gemini.container.innerHTML).not.toContain('M12 1.6c.28 2.9');
    gemini.unmount();

    const grok = render(<GrokLogo />);
    expect(grok.container.innerHTML).toContain('M13.2371 21.0407');
    expect(grok.container.querySelectorAll('path')).toHaveLength(2);
    expect(grok.container.innerHTML).not.toContain('M12 2.1 13.7 8.4');
    grok.unmount();
  });

  it('HostLogo maps each platform id to its brand mark', () => {
    const { container, unmount } = render(
      <>
        <HostLogo id="chatgpt" />
        <HostLogo id="claude" />
        <HostLogo id="gemini" />
        <HostLogo id="grok" />
      </>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(4);
    unmount();
  });
});
