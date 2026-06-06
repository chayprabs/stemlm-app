/**
 * Attach in-memory text files to a host page's <input type="file"> without
 * opening the OS file picker. Used by the Gemini adapter for protocol injection.
 */

const DEFAULT_FILE_INPUT_SELECTORS = [
  'images-files-uploader input[type="file"]',
  'input-area input[type="file"]',
  'rich-textarea input[type="file"]',
  'input[type="file"]',
];

const DEFAULT_UPLOAD_BUTTON_SELECTORS = [
  'button[aria-label*="Upload" i]',
  'button[aria-label*="Add file" i]',
  'button[aria-label*="Attach" i]',
  'button[aria-label*="Insert" i]',
  '[data-test-id*="upload" i]',
  'button.upload-button',
];

const DEFAULT_ATTACHMENT_SELECTORS = [
  'images-files-uploader [class*="preview"]',
  'images-files-uploader [class*="chip"]',
  'images-files-uploader [class*="file"]',
  'images-files-uploader img',
  '[class*="file-preview"]',
  '[class*="attachment-chip"]',
  'uploader-file-preview',
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
      if (el) return el;
    } catch {
      /* skip */
    }
  }
  return null;
}

/** Assign a File to a file input via DataTransfer (never calls input.click()). */
export function assignFileToInput(input: HTMLInputElement, file: File): boolean {
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    if (input.files?.length) {
      fireInputChange(input);
      return true;
    }
  } catch {
    /* fall through */
  }

  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
    desc?.set?.call(input, dt.files);
    fireInputChange(input);
    return (input.files?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function fireInputChange(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Try drag-drop onto a drop target (works on some hosts). */
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

export interface FindFileInputOptions {
  fileInputSelectors?: string[];
  uploadButtonSelectors?: string[];
  waitMs?: number;
}

/**
 * Locate a file input — click the host upload button if needed and poll until
 * the input appears (Gemini creates it dynamically).
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
}

/** Wait until the UI shows an uploaded file chip/preview. */
export async function waitForAttachment(opt: WaitAttachmentOptions = {}): Promise<boolean> {
  const sels = opt.attachmentSelectors ?? DEFAULT_ATTACHMENT_SELECTORS;
  const timeoutMs = opt.timeoutMs ?? 4000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const sel of sels) {
      try {
        const el = document.querySelector(sel);
        if (el && (el as HTMLElement).offsetParent !== null) return true;
      } catch {
        /* skip */
      }
    }
    // Gemini uploader custom element with children = file attached
    const uploader = document.querySelector('images-files-uploader');
    if (uploader && uploader.childElementCount > 1) return true;
    await sleep(100);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface AttachTextFileOptions extends FindFileInputOptions, WaitAttachmentOptions {
  filename?: string;
  dropTargets?: string[];
}

/**
 * Full attach pipeline: find input → assign file → wait for UI confirmation.
 * Optionally tries drop targets first.
 */
export async function attachTextFile(
  content: string,
  opt: AttachTextFileOptions = {},
): Promise<{ ok: boolean; method: 'input' | 'drop' | 'none' }> {
  const file = createTextFile(content, opt.filename ?? 'stemlm-protocol.txt');

  const dropTargets = opt.dropTargets ?? [
    'rich-textarea',
    'input-area-v2',
    '.input-area',
    'div.ql-editor',
  ];
  for (const sel of dropTargets) {
    try {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && tryDropFile(el, file)) {
        if (await waitForAttachment(opt)) return { ok: true, method: 'drop' };
      }
    } catch {
      /* skip */
    }
  }

  const input = await findFileInput(opt);
  if (!input) return { ok: false, method: 'none' };

  if (!assignFileToInput(input, file)) return { ok: false, method: 'none' };

  const attached = await waitForAttachment(opt);
  return { ok: attached, method: 'input' };
}
