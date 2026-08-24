/**
 * Attach in-memory text files to a host page's <input type="file"> without
 * opening the OS file picker. Used to inject stemlm-protocol.txt the same way
 * a student attaches an image or PDF — additive, so existing uploads stay.
 */

export const PROTOCOL_ATTACHMENT_NAME = 'stemlm-protocol.txt';

const DEFAULT_FILE_INPUT_SELECTORS = [
  'images-files-uploader input[type="file"]',
  'input-area input[type="file"]',
  'rich-textarea input[type="file"]',
  'form input[type="file"]',
  'fieldset input[type="file"]',
  '[data-testid*="composer" i] input[type="file"]',
  'input[type="file"]',
];

const DEFAULT_UPLOAD_BUTTON_SELECTORS = [
  'button[aria-label*="Upload" i]',
  'button[aria-label*="Add file" i]',
  'button[aria-label*="Attach" i]',
  'button[aria-label*="Insert" i]',
  '[data-test-id*="upload" i]',
  '[data-testid*="upload" i]',
  'button.upload-button',
];

export const COMPOSER_ATTACHMENT_SELECTORS = [
  'images-files-uploader [class*="preview"]',
  'images-files-uploader [class*="chip"]',
  'images-files-uploader [class*="file"]',
  'images-files-uploader img',
  '[class*="file-preview"]',
  '[class*="attachment-chip"]',
  '[class*="file-chip"]',
  '[class*="attachment-preview"]',
  'uploader-file-preview',
  '[data-testid*="file-preview" i]',
  '[data-testid*="file-thumbnail" i]',
  '[data-testid="file-attachment"]',
  '[data-testid*="attachment-chip" i]',
];

const DEFAULT_DROP_TARGETS = [
  'images-files-uploader',
  'rich-textarea',
  'input-area-v2',
  '.input-area',
  'div.ql-editor',
  '#prompt-textarea',
  '[data-testid="prompt-textarea"]',
  'div.ProseMirror[contenteditable="true"]',
  'fieldset:has([contenteditable])',
  'form:has(input[type="file"])',
  'textarea[aria-label*="Ask Grok" i]',
  '[class*="chat-input"]',
];

export function createTextFile(content: string, filename: string): File {
  return new File([content], filename, { type: 'text/plain', lastModified: Date.now() });
}

function queryFirst(selectors: string[], root: ParentNode = document): HTMLInputElement | null {
  for (const sel of selectors) {
    try {
      const el = root.querySelector<HTMLInputElement>(sel);
      if (el) return el;
    } catch {
      /* invalid selector */
    }
  }
  return null;
}

function queryButton(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    try {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && !opensUploadMenu(el)) return el;
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * Leading + on Gemini / ChatGPT / Claude / Grok often opens a menu, not a
 * hidden file input. Clicking it is wrong — skip those controls.
 */
function opensUploadMenu(el: HTMLElement): boolean {
  const label = [
    el.getAttribute('aria-label') ?? '',
    el.getAttribute('mattooltip') ?? '',
    el.getAttribute('title') ?? '',
  ]
    .join(' ')
    .toLowerCase();
  if (label.includes('menu')) return true;
  if (label.includes('and more')) return true;
  const popup = (el.getAttribute('aria-haspopup') ?? '').toLowerCase();
  if (popup === 'menu' || popup === 'true' || popup === 'dialog' || popup === 'listbox') {
    return true;
  }
  return false;
}

function elementMentionsFilename(el: Element, filename: string): boolean {
  const needle = filename.toLowerCase();
  const stem = needle.replace(/\.[^.]+$/, '');
  const hay = [
    el.textContent ?? '',
    el.getAttribute('aria-label') ?? '',
    el.getAttribute('title') ?? '',
    el.getAttribute('alt') ?? '',
    el.getAttribute('data-name') ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(needle) || (stem.length >= 8 && hay.includes(stem));
}

/** True when the composer UI already shows a chip/preview for `filename`. */
export function hasNamedAttachment(
  filename: string,
  root: ParentNode = document,
): boolean {
  const sels = [
    ...COMPOSER_ATTACHMENT_SELECTORS,
    'images-files-uploader',
    '[class*="chip"]',
    '[class*="preview"]',
    '[class*="attachment"]',
  ];
  const seen = new Set<Element>();
  for (const sel of sels) {
    try {
      for (const el of root.querySelectorAll(sel)) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (elementMentionsFilename(el, filename)) return true;
      }
    } catch {
      /* skip */
    }
  }
  return false;
}

function isShownChip(el: Element): boolean {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
  const style = el.style;
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return true;
}

/** True when any file/image chip is visible (problem photo, PDF, etc.). */
export function hasAnyAttachment(root: ParentNode = document): boolean {
  for (const sel of COMPOSER_ATTACHMENT_SELECTORS) {
    try {
      const el = root.querySelector(sel);
      if (el && isShownChip(el)) return true;
    } catch {
      /* skip */
    }
  }
  const uploader = root.querySelector('images-files-uploader');
  return Boolean(uploader && uploader.childElementCount > 1);
}

function existingInputFiles(input: HTMLInputElement): File[] {
  return input.files ? Array.from(input.files) : [];
}

/**
 * Assign a File to a file input via DataTransfer (never calls input.click()).
 * When `keepExisting` is set, prior FileList entries are preserved so a
 * problem image/PDF is not replaced by stemlm-protocol.txt.
 */
export function assignFileToInput(
  input: HTMLInputElement,
  file: File,
  opt?: { keepExisting?: boolean },
): boolean {
  const keepExisting = opt?.keepExisting !== false;
  const prior = keepExisting
    ? existingInputFiles(input).filter((f) => f.name !== file.name)
    : [];

  const fill = (dt: DataTransfer) => {
    for (const f of prior) dt.items.add(f);
    dt.items.add(file);
  };

  if (keepExisting && prior.length > 0) {
    try {
      input.multiple = true;
    } catch {
      /* some hosts freeze the attribute */
    }
  }

  try {
    const dt = new DataTransfer();
    fill(dt);
    input.files = dt.files;
    if (input.files?.length) {
      fireInputChange(input);
      return Array.from(input.files).some((f) => f.name === file.name);
    }
  } catch {
    /* fall through */
  }

  try {
    const dt = new DataTransfer();
    fill(dt);
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
    desc?.set?.call(input, dt.files);
    fireInputChange(input);
    const files = input.files ? Array.from(input.files) : [];
    return files.some((f) => f.name === file.name);
  } catch {
    return false;
  }
}

function fireInputChange(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Try drag-drop onto a drop target (additive on hosts that accept files). */
export function tryDropFile(target: HTMLElement, file: File): boolean {
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    const types = ['dragenter', 'dragover', 'drop'] as const;
    for (const type of types) {
      const ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
      target.dispatchEvent(ev);
    }
    return true;
  } catch {
    return false;
  }
}

/** Try pasting a File onto the composer (same path as pasting an image). */
export function tryPasteFile(target: HTMLElement, file: File): boolean {
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    const evt = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    target.dispatchEvent(evt);
    return true;
  } catch {
    return false;
  }
}

export interface FindFileInputOptions {
  fileInputSelectors?: string[];
  uploadButtonSelectors?: string[];
  waitMs?: number;
}

/**
 * Locate a file input — click the host upload button if needed and poll until
 * the input appears (Gemini creates it dynamically). Skips buttons that open
 * a menu rather than a file picker.
 */
export async function findFileInput(opt: FindFileInputOptions = {}): Promise<HTMLInputElement | null> {
  const fileSels = opt.fileInputSelectors ?? DEFAULT_FILE_INPUT_SELECTORS;
  const btnSels = opt.uploadButtonSelectors ?? DEFAULT_UPLOAD_BUTTON_SELECTORS;
  const waitMs = opt.waitMs ?? 2500;
  const deadline = Date.now() + waitMs;

  let input = queryFirst(fileSels);
  if (input) return input;

  const btn = queryButton(btnSels);
  if (btn) {
    btn.click();
    while (Date.now() < deadline) {
      await sleep(80);
      input = queryFirst(fileSels);
      if (input) return input;
    }
  }

  return queryFirst(fileSels);
}

export interface WaitAttachmentOptions {
  attachmentSelectors?: string[];
  timeoutMs?: number;
  /** When set, wait for THIS filename — not any pre-existing image/PDF chip. */
  filename?: string;
}

/** Wait until the UI shows an uploaded file chip/preview. */
export async function waitForAttachment(opt: WaitAttachmentOptions = {}): Promise<boolean> {
  const filename = opt.filename;
  const timeoutMs = opt.timeoutMs ?? 4000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (filename ? hasNamedAttachment(filename) : hasAnyAttachment()) return true;
    await sleep(80);
  }
  return filename ? hasNamedAttachment(filename) : hasAnyAttachment();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface AttachTextFileOptions extends FindFileInputOptions, WaitAttachmentOptions {
  filename?: string;
  dropTargets?: string[];
  /**
   * When true, never replace the file input's FileList (problem image/PDF
   * already attached). Only additive drop/paste is attempted.
   */
  preserveExisting?: boolean;
  /** Short confirm window for drop/paste so we can fall through quickly. */
  additiveTimeoutMs?: number;
}

async function tryAdditiveAttach(
  file: File,
  filename: string,
  targets: string[],
  timeoutMs: number,
): Promise<'drop' | 'paste' | null> {
  const seen = new Set<HTMLElement>();
  const els: HTMLElement[] = [];
  for (const sel of targets) {
    let el: HTMLElement | null = null;
    try {
      el = document.querySelector<HTMLElement>(sel);
    } catch {
      continue;
    }
    if (!el || seen.has(el)) continue;
    seen.add(el);
    els.push(el);
    if (els.length >= 2) break;
  }

  for (const el of els) {
    if (tryDropFile(el, file) && (await waitForAttachment({ filename, timeoutMs }))) {
      return 'drop';
    }
    if (tryPasteFile(el, file) && (await waitForAttachment({ filename, timeoutMs }))) {
      return 'paste';
    }
  }
  return null;
}

/**
 * Full attach pipeline: prefer additive drop/paste so existing images/PDFs
 * stay, then (only when the composer is empty of files) assign to the input.
 */
export async function attachTextFile(
  content: string,
  opt: AttachTextFileOptions = {},
): Promise<{ ok: boolean; method: 'input' | 'drop' | 'paste' | 'existing' | 'none' }> {
  const filename = opt.filename ?? PROTOCOL_ATTACHMENT_NAME;
  if (hasNamedAttachment(filename)) return { ok: true, method: 'existing' };

  const file = createTextFile(content, filename);
  const dropTargets = opt.dropTargets ?? DEFAULT_DROP_TARGETS;
  const preserveExisting = opt.preserveExisting ?? hasAnyAttachment();
  const additiveTimeoutMs =
    opt.additiveTimeoutMs ?? (preserveExisting ? 800 : 200);

  const additive = await tryAdditiveAttach(file, filename, dropTargets, additiveTimeoutMs);
  if (additive) return { ok: true, method: additive };

  const input = await findFileInput(opt);
  if (!input) return { ok: false, method: 'none' };

  const prior = existingInputFiles(input).filter((f) => f.name !== filename);

  if (preserveExisting && prior.length === 0 && hasAnyAttachment()) {
    // FileList does not hold the image/PDF chip — assigning would replace it.
    return { ok: false, method: 'none' };
  }

  if (!assignFileToInput(input, file, { keepExisting: true })) return { ok: false, method: 'none' };

  const files = input.files ? Array.from(input.files) : [];
  const hasProtocol = files.some((f) => f.name === filename);
  const keptPriors = prior.every((p) => files.some((f) => f.name === p.name));
  if (!hasProtocol || (prior.length > 0 && !keptPriors)) {
    return { ok: false, method: 'none' };
  }

  const attached = await waitForAttachment({
    ...opt,
    filename,
    timeoutMs: opt.timeoutMs ?? 4000,
  });
  return { ok: attached, method: 'input' };
}
