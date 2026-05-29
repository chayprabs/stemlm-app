/** Platform adapter contract. Each AI site gets one adapter. */

export type PlatformId =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'perplexity'
  | 'grok'
  | 'deepseek';

/**
 * Per-site brand colours used to make the overlay button visually belong on
 * each host (combined with the detected host light/dark scheme). `accent` is
 * the site's signature colour; `neutral` opts the button into a monochrome look
 * matching the site's own send button (ChatGPT / Grok).
 */
export interface PlatformBrand {
  accent: string;
  accentFg?: string;
  /** Prefer a neutral (monochrome) button that matches the site's UI. */
  neutral?: boolean;
}

export interface PlatformAdapter {
  readonly id: PlatformId;
  readonly label: string;
  /** Brand palette for the overlay button. */
  readonly brand: PlatformBrand;
  /** Selectors for page containers to shrink when splitting the screen. */
  readonly layoutRoots: string[];

  /** Does this adapter handle the current page (by hostname)? */
  matches(host?: string): boolean;

  /** The composer editor element (contenteditable or textarea), if present. */
  findEditor(): HTMLElement | null;

  /** Current text in the composer. */
  getEditorText(): string;

  /** Replace the composer content with `text`. Returns success. */
  insertPrompt(text: string): boolean;

  /** A stable element near the composer to dock the stemLM button beside. */
  getComposerAnchor(): HTMLElement | null;

  /** Assistant message containers, oldest first. */
  getAssistantBlocks(): HTMLElement[];

  /** Plain text of the newest assistant message (for completion detection). */
  getLatestAssistantText(): string;

  /**
   * Capsule candidate texts found in assistant messages (oldest first). Reads
   * the rendered code blocks, where the model is told to place the capsule.
   */
  extractCapsules(): string[];

  /** Best-effort: is the assistant currently generating? */
  isStreaming(): boolean;
}

/** Declarative config used by the adapter factory. */
export interface AdapterConfig {
  id: PlatformId;
  label: string;
  hosts: RegExp;
  /** Editor selectors, tried in order. */
  editor: string[];
  /** Where to anchor the button (tried in order). Falls back to editor parent. */
  composerAnchor: string[];
  /** Assistant message container selectors (tried in order). */
  assistant: string[];
  /** Code-block selectors within an assistant message. */
  codeBlock: string[];
  /** Selectors that, if present, indicate generation is in progress (e.g. stop button). */
  streaming: string[];
  /** Brand palette for the overlay button. */
  brand: PlatformBrand;
  /**
   * Page containers to clamp when splitting the screen, so SPA layouts that
   * ignore body margin still reflow into the left half. Generic fallbacks are
   * appended automatically by the factory.
   */
  layoutRoots?: string[];
}
