import { describe, it, expect, beforeEach } from 'vitest';
import {
  assignFileToInput,
  attachTextFile,
  createTextFile,
  findFileInput,
  hasNamedAttachment,
  hasAnyAttachment,
} from './file-inject';

describe('createTextFile', () => {
  it('builds a plain-text File with the given name', () => {
    const file = createTextFile('hello', 'stemlm-protocol.txt');
    expect(file.name).toBe('stemlm-protocol.txt');
    expect(file.type).toBe('text/plain');
  });
});

describe('assignFileToInput', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input type="file" id="f" multiple />';
  });

  it('assigns a file via DataTransfer and fires change events', () => {
    const input = document.getElementById('f') as HTMLInputElement;
    let changed = false;
    input.addEventListener('change', () => {
      changed = true;
    });
    const file = createTextFile('protocol body', 'stemlm-protocol.txt');
    expect(assignFileToInput(input, file)).toBe(true);
    expect(input.files?.length).toBe(1);
    expect(input.files?.[0]?.name).toBe('stemlm-protocol.txt');
    expect(changed).toBe(true);
  });

  it('keeps prior files when adding the protocol', () => {
    const input = document.getElementById('f') as HTMLInputElement;
    const photo = new File(['img'], 'problem.png', { type: 'image/png' });
    expect(assignFileToInput(input, photo, { keepExisting: false })).toBe(true);
    const proto = createTextFile('protocol body', 'stemlm-protocol.txt');
    expect(assignFileToInput(input, proto, { keepExisting: true })).toBe(true);
    const names = Array.from(input.files ?? []).map((f) => f.name);
    expect(names).toContain('problem.png');
    expect(names).toContain('stemlm-protocol.txt');
  });
});

describe('findFileInput', () => {
  it('returns an existing file input without clicking upload', async () => {
    document.body.innerHTML = '<images-files-uploader><input type="file" id="u" /></images-files-uploader>';
    const input = await findFileInput({ waitMs: 200 });
    expect(input?.id).toBe('u');
  });

  it('clicks the upload button and waits for a dynamically added input', async () => {
    document.body.innerHTML = '<button aria-label="Upload file">+</button>';
    const btn = document.querySelector('button')!;
    btn.addEventListener('click', () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<images-files-uploader><input type="file" id="late" /></images-files-uploader>',
      );
    });
    const input = await findFileInput({ waitMs: 1000 });
    expect(input?.id).toBe('late');
  });

  it('does not click a button that opens an upload menu', async () => {
    document.body.innerHTML = '<button aria-label="Open upload file menu">+</button>';
    const btn = document.querySelector('button')!;
    let clicked = false;
    btn.addEventListener('click', () => {
      clicked = true;
    });
    const input = await findFileInput({ waitMs: 200 });
    expect(input).toBeNull();
    expect(clicked).toBe(false);
  });

  it('does not click a + with aria-haspopup=menu even without the word menu', async () => {
    document.body.innerHTML =
      '<button aria-label="Add files and more" aria-haspopup="menu">+</button>';
    const btn = document.querySelector('button')!;
    let clicked = false;
    btn.addEventListener('click', () => {
      clicked = true;
    });
    const input = await findFileInput({ waitMs: 200 });
    expect(input).toBeNull();
    expect(clicked).toBe(false);
  });
});

describe('attachTextFile', () => {
  it('attaches via file input and detects the preview chip', async () => {
    document.body.innerHTML = `
      <images-files-uploader>
        <input type="file" id="f" />
      </images-files-uploader>
    `;
    const input = document.getElementById('f') as HTMLInputElement;
    input.addEventListener('change', () => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      chip.textContent = 'stemlm-protocol.txt';
      document.querySelector('images-files-uploader')!.appendChild(chip);
    });

    const result = await attachTextFile('OUTPUT:\n@end', {
      waitMs: 500,
      timeoutMs: 1500,
      dropTargets: [],
    });
    expect(result.ok).toBe(true);
    expect(result.method).toBe('input');
  });

  it('returns existing when the protocol chip is already present', async () => {
    document.body.innerHTML = `
      <images-files-uploader>
        <div class="attachment-chip">stemlm-protocol.txt</div>
      </images-files-uploader>
    `;
    const result = await attachTextFile('OUTPUT:\n@end');
    expect(result).toEqual({ ok: true, method: 'existing' });
  });

  it('does not treat an unrelated image chip as the protocol file', () => {
    document.body.innerHTML = `
      <images-files-uploader>
        <div class="attachment-chip">problem.png</div>
      </images-files-uploader>
    `;
    expect(hasAnyAttachment()).toBe(true);
    expect(hasNamedAttachment('stemlm-protocol.txt')).toBe(false);
  });

  it('adds the protocol beside a problem image already in the FileList', async () => {
    document.body.innerHTML = `
      <images-files-uploader>
        <input type="file" id="f" multiple />
        <div class="attachment-chip">problem.png</div>
      </images-files-uploader>
    `;
    const input = document.getElementById('f') as HTMLInputElement;
    const photo = new File(['img'], 'problem.png', { type: 'image/png' });
    expect(assignFileToInput(input, photo, { keepExisting: false })).toBe(true);
    input.addEventListener('change', () => {
      if (!hasNamedAttachment('stemlm-protocol.txt')) {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.textContent = 'stemlm-protocol.txt';
        document.querySelector('images-files-uploader')!.appendChild(chip);
      }
    });
    const result = await attachTextFile('OUTPUT:\n@end', {
      preserveExisting: true,
      dropTargets: [],
      additiveTimeoutMs: 40,
      waitMs: 200,
      timeoutMs: 800,
    });
    expect(result.ok).toBe(true);
    expect(result.method).toBe('input');
    const names = Array.from(input.files ?? []).map((f) => f.name);
    expect(names).toContain('problem.png');
    expect(names).toContain('stemlm-protocol.txt');
  });

  it('does not replace an existing image via the file input', async () => {
    document.body.innerHTML = `
      <images-files-uploader>
        <input type="file" id="f" />
        <div class="attachment-chip">problem.png</div>
      </images-files-uploader>
    `;
    const result = await attachTextFile('OUTPUT:\n@end', {
      preserveExisting: true,
      additiveTimeoutMs: 40,
      waitMs: 100,
      timeoutMs: 100,
    });
    expect(result.ok).toBe(false);
    expect(result.method).toBe('none');
    const input = document.getElementById('f') as HTMLInputElement;
    expect(input.files?.length ?? 0).toBe(0);
  });

  it('attaches additively on a ChatGPT-style composer with a + menu and hidden file input', async () => {
    document.body.innerHTML = `
      <form>
        <button aria-label="Add files and more" aria-haspopup="menu">+</button>
        <input type="file" id="f" multiple />
        <div id="prompt-textarea" contenteditable="true"></div>
        <div class="attachment-chip">problem.png</div>
      </form>
    `;
    const input = document.getElementById('f') as HTMLInputElement;
    const photo = new File(['img'], 'problem.png', { type: 'image/png' });
    expect(assignFileToInput(input, photo, { keepExisting: false })).toBe(true);
    const plus = document.querySelector('button')!;
    let plusClicked = false;
    plus.addEventListener('click', () => {
      plusClicked = true;
    });
    input.addEventListener('change', () => {
      if (!hasNamedAttachment('stemlm-protocol.txt')) {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.textContent = 'stemlm-protocol.txt';
        document.querySelector('form')!.appendChild(chip);
      }
    });
    const result = await attachTextFile('OUTPUT:\n@end', {
      preserveExisting: true,
      dropTargets: [],
      additiveTimeoutMs: 40,
      waitMs: 200,
      timeoutMs: 800,
    });
    expect(result.ok).toBe(true);
    expect(result.method).toBe('input');
    expect(plusClicked).toBe(false);
    const names = Array.from(input.files ?? []).map((f) => f.name);
    expect(names).toContain('problem.png');
    expect(names).toContain('stemlm-protocol.txt');
  });

  it('adds the protocol via drop beside an existing image', async () => {
    document.body.innerHTML = `
      <images-files-uploader>
        <div class="attachment-chip">problem.png</div>
        <input type="file" id="f" />
      </images-files-uploader>
    `;
    const uploader = document.querySelector('images-files-uploader')!;
    uploader.addEventListener('drop', () => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      chip.textContent = 'stemlm-protocol.txt';
      uploader.appendChild(chip);
    });
    const result = await attachTextFile('OUTPUT:\n@end', {
      preserveExisting: true,
      additiveTimeoutMs: 300,
    });
    expect(result.ok).toBe(true);
    expect(result.method).toBe('drop');
    expect(hasNamedAttachment('stemlm-protocol.txt')).toBe(true);
    expect(uploader.textContent).toContain('problem.png');
  });
});
