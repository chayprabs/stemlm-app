/** Chat hosts stemLM actually ships adapters for. */
export const PLATFORM_IDS = ['chatgpt', 'claude', 'gemini', 'grok'] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === 'string' && (PLATFORM_IDS as readonly string[]).includes(value);
}

/**
 * Per-site brand colours used to make the overlay button visually belong on
 * each host (combined with the detected host light/dark scheme). `accent` is
 * the site's signature colour; `neutral` opts the button into a monochrome look
 * matching Gemini's send button when `neutral` is set.
 */
export interface PlatformBrand {
  accent: string;
  accentFg?: string;
  /** Prefer a neutral (monochrome) button that matches the site's UI. */
  neutral?: boolean;
}

export interface ComposerLayout {
  /** Visual outer shell of the chat input (border, radius). */
  box: HTMLElement;
  /** Bottom toolbar row where send + trailing actions live. */
  actionRow: HTMLElement;
}

export interface PlatformAdapter {
  readonly id: PlatformId;
  readonly label: string;
  /** Brand palette for the overlay button. */
  readonly brand: PlatformBrand;
  /** Hidden file inputs that take the guide; shared defaults when omitted. */
  readonly fileInput?: string[];
  /** The host adds each file set on its input to its attachment list instead of replacing it. */
  readonly additiveFileInput?: boolean;
  /** Selectors for page containers to shrink when splitting the screen. */
  readonly layoutRoots: string[];

  /** Does this adapter handle the current page (by hostname)? */
  matches(host?: string): boolean;

  /**
   * The chat's own composer editor (contenteditable or textarea), if present. Never an earlier
   * message opened for editing or a field in a dialog.
   */
  findEditor(): HTMLElement | null;

  /**
   * False when this composer is known not to take a file (logged-out ChatGPT answers one with a
   * login wall): the guide then goes into the message as text. Optional for test doubles.
   */
  acceptsFiles?(): boolean;

  /** Current text in the composer. */
  getEditorText(): string;

  /**
   * Write `text` into the composer. `append` keeps existing text/attachments and
   * adds the protocol at the bottom; `replace` clears the composer first.
   */
  insertPrompt(text: string, mode?: 'replace' | 'append'): boolean;

  /** True when the composer has file/image attachments (e.g. a photo of a problem). */
  composerHasAttachments(): boolean;

  /** Move focus into the follow-up "Ask your question here:" slot. */
  focusComposerQuestionSlot(): void;

  /** Outer composer container for in-box button positioning. */
  getComposerBox(): HTMLElement | null;

  /** Action row inside the composer (send button toolbar). */
  getComposerActionRow(): HTMLElement | null;

  /** Resolved box + action row together. */
  getComposerLayout(): ComposerLayout | null;

  /** A stable element near the composer to dock the stemLM button beside. */
  getComposerAnchor(): HTMLElement | null;

  /** The chat's own attach button (upload / +): the composer control sits beside it. */
  getComposerLeadingAnchor(): HTMLElement | null;

  /**
   * The smallest element holding both the editor and the attach button: the composer, found by
   * structure. Null when either is missing or they only share the page. Optional for test doubles.
   */
  getComposerRoot?(): HTMLElement | null;

  /**
   * The outer composer shell (input box container). The overlay button docks
   * just outside its left edge, before the leading (+) control.
   */
  getComposerShell(): HTMLElement | null;

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

  /**
   * Text of the student's message that `block` answers: the nearest user turn before it in the
   * page, as the host shows it (stemLM's own stub included). Empty when the host's user markup is
   * not recognised; callers fall back to the answer's own topic. Optional for test doubles.
   */
  getUserQuestionBefore?(block: Element): string;
}

/** Declarative config used by the adapter factory. */
export interface AdapterConfig {
  id: PlatformId;
  label: string;
  hosts: RegExp;
  /**
   * Hidden file inputs that take the guide, tried in order. Needed where the first
   * input in the composer only accepts images (ChatGPT).
   */
  fileInput?: string[];
  /** The host input appends to its attachment list (Claude, ChatGPT), so assign directly. */
  additiveFileInput?: boolean;
  /** Editor selectors, tried in order. */
  editor: string[];
  /** Editors of a composer that cannot take a file (logged-out ChatGPT). */
  noFileEditor?: string[];
  /** Outer composer container — tried in order. */
  composerBox: string[];
  /** Action/toolbar row inside the box — tried in order. */
  composerActionRow: string[];
  /** Send/submit control — tried in order. */
  composerAnchor: string[];
  /**
   * The attach button (upload / +): test ids and structure first, then labels. Tried in order in
   * each wrapper around the editor, nearest first, so keep every entry specific to that button.
   */
  composerLeading?: string[];
  /** Outer composer container for in-box overlay placement (tried in order). */
  composerShell?: string[];
  /** Assistant message container selectors (tried in order). */
  assistant: string[];
  /** Code-block selectors within an assistant message. */
  codeBlock: string[];
  /** Citation tokens the host prints raw inside code blocks (ChatGPT cites the attached guide); removed from answers. */
  citationMarkers?: RegExp[];
  /** Selectors that, if present, indicate generation is in progress (e.g. stop button). */
  streaming: string[];
  /** The student's own turns, tried in order; shared fallbacks are appended by the factory. */
  userMessage?: string[];
  /** Where a user turn keeps its typed text (the turn itself also holds file chips and labels). */
  userMessageText?: string[];
  /** Brand palette for the overlay button. */
  brand: PlatformBrand;
  /**
   * Page containers to clamp when splitting the screen, so SPA layouts that
   * ignore body margin still reflow into the left half. Generic fallbacks are
   * appended automatically by the factory.
   */
  layoutRoots?: string[];
}
