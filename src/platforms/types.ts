/** Platform adapter contract. Each AI site gets one adapter. */

export type PlatformId = 'chatgpt' | 'claude' | 'gemini';

export interface PlatformAdapter {
  readonly id: PlatformId;
  readonly label: string;

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
}
