/**
 * The composer of each stand-in page, built from the real sites' DOM.
 *
 * Structure, test ids, labels and sizes follow the capture of 2026-11-17 (viewport 1528x732, Grok
 * 1142x686): the attach button is the left-most control, the editor sits behind several wrappers,
 * some of them `display: contents`. Classes and roles the capture did not record are left out, so
 * an adapter that leans on them fails here as it would on the site.
 *
 * The doubles also behave like the sites where that moves the composer:
 *  - it sits mid-page on a new chat and drops to the bottom once a message is sent;
 *  - it grows with the draft (up to a cap, then the draft scrolls) and with a file chip, so the
 *    button row moves;
 *  - the host re-renders it: after an upload and a layout switch the attach button is a new node
 *    and foreign attributes are gone; after a send and on navigation between chats the whole
 *    composer is (the editor and the form survive an upload, as they do on the sites);
 *  - logged-out ChatGPT serves a <textarea> with 44 px buttons and answers a file with a login wall;
 *  - Gemini has no file input until its upload menu opens, and can open under a consent screen;
 *  - other editors exist: a search box, an earlier message being edited, a canvas, a settings page.
 * `window.__standin` drives these from a test.
 */

const PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
const MIC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const CLIP = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m20 11-8.2 8.2a5 5 0 0 1-7-7L13 4a3.4 3.4 0 0 1 4.8 4.8l-8.1 8.1a1.8 1.8 0 0 1-2.6-2.6L14.6 7"/></svg>';

/** Composer width per host, from the capture. */
const WIDTH = { chatgpt: 768, claude: 656, gemini: 660, grok: 764 };

/** `out` is logged-out ChatGPT; every other host has one layout in the capture. */
export const composerVariants = (id) => (id === 'chatgpt' ? ['in', 'out'] : ['in']);

export function composerHtml(id, variant = 'in') {
  if (id === 'chatgpt' && variant === 'out') {
    return `
    <form data-hc-composer data-landing data-logged-out data-mobile-composer class="hc box gpt-out">
      <div style="display:contents"><div style="display:contents"><div style="display:contents">
        <div data-mobile-composer-action-field class="out-cell"><button type="button" class="hc-btn" aria-label="Add files and more">${PLUS}</button></div>
        <div data-mobile-composer-primary class="out-primary"><div class="out-field"><div style="display:contents">
          <textarea id="mobile-composer-prompt" class="editor" rows="1" aria-label="Chat with ChatGPT" placeholder="Ask anything"></textarea>
        </div></div></div>
        <div class="out-cell out-end"><button type="button" class="hc-btn" aria-label="Start dictation">${MIC}</button></div>
        <div class="out-cell"><button type="submit" class="hc-btn hc-send" aria-label="Send prompt">${UP}</button></div>
      </div></div></div>
      <input id="octane-mobile-composer-photos-input" type="file" accept="image/*" multiple hidden />
      <input id="octane-mobile-composer-files-input" type="file" multiple hidden />
      <input id="octane-mobile-composer-camera-input" type="file" accept="image/*" multiple hidden />
    </form>`;
  }
  if (id === 'chatgpt') {
    return `
    <form data-hc-composer data-type="unified-composer" class="hc box gpt">
      <div role="presentation" data-composer-layout="single-line" class="gpt-col">
        <input type="file" accept="image/*,video/*" aria-label="Attach photos or videos" multiple hidden />
        <input type="file" accept="image/*" aria-label="Attach photos" multiple hidden />
        <input type="file" aria-label="Attach files" multiple hidden />
        <div data-composer-attachments><div class="hc-chips chips"></div></div>
        <div data-composer-layout="single-line" class="gpt-grid">
          <div class="gpt-lead"><div style="display:flex"><span data-state="closed" style="display:contents">
            <button type="button" class="hc-btn" data-testid="composer-plus-btn" aria-label="Add files and more" aria-haspopup="menu" aria-expanded="false">${PLUS}</button>
          </span></div></div>
          <div class="gpt-primary"><div id="prompt-textarea" class="ProseMirror editor" contenteditable="true" aria-label="Ask ChatGPT" data-placeholder="Ask anything"></div></div>
          <div class="gpt-trail">
            <button type="button" class="hc-btn" aria-label="Start dictation">${MIC}</button>
            <button type="submit" class="hc-btn hc-send" data-testid="send-button" aria-label="Send prompt">${UP}</button>
          </div>
        </div>
      </div>
    </form>`;
  }
  if (id === 'claude') {
    return `
    <div data-hc-composer class="hc cl">
      <div class="cl-card box"><div class="cl-pad">
        <div class="hc-chips chips"></div>
        <div class="cl-edit"><div><div>
          <div data-testid="chat-input" class="editor" contenteditable="true" aria-label="Write your prompt to Claude" data-placeholder="How can I help you today?"></div>
        </div></div></div>
        <div class="cl-row">
          <button type="button" class="hc-btn" data-testid="chat-input-attach" aria-label="Add files, connectors, and more" aria-haspopup="menu">${PLUS}</button>
          <span class="hc-space"></span>
          <button type="button" class="hc-btn" aria-label="Dictate">${MIC}</button>
          <button type="button" class="hc-btn cl-thin" aria-label="Microphone"></button>
          <button type="button" class="hc-btn hc-send" data-testid="chat-input-send" aria-label="Send message">${UP}</button>
        </div>
      </div></div>
      <div class="cl-below">
        <button type="button" class="hc-pill">Project</button>
        <span class="hc-space"></span>
        <button type="button" class="hc-pill" data-testid="model-selector-dropdown" aria-label="Model: Sonnet">Sonnet</button>
      </div>
      <input id="chat-input-file-upload-onpage" data-testid="file-upload" type="file" multiple hidden />
    </div>`;
  }
  if (id === 'grok') {
    return `
    <form data-hc-composer class="hc box gk">
      <div class="hc-chips chips"></div>
      <button type="button" class="hc-btn" data-testid="attach-button" aria-label="Add files, skills, and connectors" aria-haspopup="menu">${CLIP}</button>
      <input type="file" multiple hidden />
      <div class="gk-mid"><div class="gk-mid2">
        <div class="gk-grow"><div data-testid="chat-input"><div>
          <div class="editor" contenteditable="true" aria-label="Message Grok" data-placeholder="What do you want to know?"></div>
        </div></div></div>
        <button type="button" id="model-select-trigger" class="gk-model" aria-label="Model: Fast">Fast</button>
      </div></div>
      <button type="submit" class="hc-btn hc-send" data-testid="chat-submit" aria-label="Send">${UP}</button>
    </form>`;
  }
  return `
    <input-area-v2 data-hc-composer class="hc gm">
      <div><fieldset class="box gm-field"><div class="gm-row">
        <div class="hc-chips chips"></div>
        <div class="gm-lead"><button type="button" class="hc-btn" aria-label="Upload &amp; tools" aria-expanded="false">${PLUS}</button></div>
        <div class="gm-text"><div><div><div><rich-textarea>
          <div class="editor" contenteditable="true" aria-label="Enter a prompt for Gemini" data-placeholder="Ask Gemini"></div>
        </rich-textarea></div></div></div></div>
        <button type="button" class="gm-mode" data-testid="bard-mode-menu-button" aria-label="Open mode picker, currently Gemini Auto">Auto</button>
        <button type="button" class="hc-btn" aria-label="Dictate (^⇧D)">${MIC}</button>
      </div></fieldset></div>
    </input-area-v2>`;
}

export function composerCss(id, c) {
  const wash = `color-mix(in srgb, ${c.fg} 9%, transparent)`;
  return `
  main.landing .scroll { flex: none; overflow: visible; margin-top: auto; }
  main.landing .dock { margin-bottom: auto; }
  main.landing .thread { padding-bottom: 28px; }
  main.landing .hero { margin-top: 0; }
  .dock-inner { max-width: ${WIDTH[id]}px; display: block; }
  .hc { position: relative; width: 100%; margin: 0; }
  .hc.box, .hc .box { display: block; padding: 0; }
  .hc .editor { flex: none; width: 100%; min-height: 24px; max-height: 38vh; overflow-y: auto; padding: 0; line-height: 24px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .hc-btn { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 999px; background: transparent; color: ${c.fg}; cursor: pointer; }
  .hc-btn:hover { background: ${wash}; }
  .hc-btn.hc-send, .hc-btn.hc-send:hover { background: ${c.send}; color: ${c.sendFg}; }
  .hc-space { flex: 1; align-self: stretch; }
  .hc-pill, .gm-mode, .gk-model { flex: none; border: 0; background: transparent; color: ${c.muted}; font-size: 13px; border-radius: 8px; padding: 0 8px; }
  .hc-pill:hover, .gm-mode:hover, .gk-model:hover { background: ${wash}; }
  .hc-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .hc-chips:empty { display: none; }
  .attachment-chip { display: inline-flex; align-items: center; gap: 8px; height: 44px; margin: 0; padding: 0 6px 0 12px; border-radius: 12px; background: ${c.bubble}; font-size: 13px; }
  .attachment-chip[aria-busy="true"] { opacity: .55; }
  .hc-x { width: 22px; height: 22px; border: 0; border-radius: 999px; background: transparent; color: ${c.muted}; line-height: 1; }
  .hc-x:hover { background: ${wash}; }
  .hc-menu { position: absolute; left: 0; bottom: calc(100% + 8px); z-index: 20; min-width: 200px; padding: 6px; border: 1px solid ${c.boxBorder}; border-radius: 14px; background: ${c.box}; box-shadow: 0 8px 28px rgba(0,0,0,.16); font-size: 14px; }
  .hc-menu div { padding: 8px 10px; border-radius: 8px; }
  .hc-scrim { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.42); }
  .hc-dialog { width: min(440px, 90vw); padding: 24px; border-radius: 20px; background: ${c.box}; color: ${c.fg}; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
  .hc-dialog h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
  .hc-dialog p { margin: 0 0 16px; color: ${c.muted}; font-size: 14px; }
  .hc-dialog textarea, .hc-settings textarea, .hc-editbox textarea { width: 100%; min-height: 70px; margin-bottom: 12px; border: 1px solid ${c.boxBorder}; border-radius: 10px; background: transparent; color: inherit; font: inherit; padding: 8px 10px; }
  .hc-cta { height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: ${c.send}; color: ${c.sendFg}; font-size: 14px; }
  .hc-search { margin-left: auto; width: 200px; height: 32px; border: 1px solid ${c.boxBorder}; border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 13px; padding: 0 12px; }
  .hc-settings { max-width: 640px; margin: 40px auto; padding: 0 24px; }
  .hc-editbox { width: 78%; padding: 12px; border-radius: 20px; background: ${c.bubble}; }
  .hc-editbox .hc-edit-field { min-height: 48px; outline: none; }
  .hc-editbox .hc-row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  .hc-canvas { position: fixed; top: 52px; right: 0; bottom: 0; width: 38%; z-index: 5; padding: 20px; border-left: 1px solid ${c.boxBorder}; background: ${c.box}; }
  .hc-canvas .hc-doc { min-height: 60%; outline: none; }
  @media (max-width: 860px) { aside.nav { display: none; } .hc-search { display: none; } }

  /* ChatGPT, logged in: a grid whose editor takes a row of its own once the draft is long. */
  .gpt.box { border-radius: 28px; }
  .gpt [data-composer-attachments] .hc-chips { padding: 12px 12px 0; }
  .gpt-grid { display: grid; grid-template-columns: auto 1fr auto; grid-template-areas: "lead primary trail"; align-items: center; min-height: 52px; padding: 8px 10px; }
  .gpt-grid[data-composer-layout="multiline"] { grid-template-areas: "primary primary primary" "lead . trail"; row-gap: 8px; padding-top: 14px; }
  .gpt-lead { grid-area: lead; } .gpt-primary { grid-area: primary; min-width: 0; padding: 0 8px; } .gpt-trail { grid-area: trail; display: flex; gap: 6px; }
  .gpt .hc-btn { width: 36px; height: 36px; }

  /* ChatGPT, logged out: 44 px buttons in 40 px cells, wrappers without a box. */
  .gpt-out.box { display: flex; align-items: flex-end; min-height: 52px; padding: 4px 7px; border-radius: 28px; }
  .out-cell { flex: none; display: grid; grid-template-columns: 40px; height: 44px; }
  .out-cell.out-end { justify-items: end; }
  .gpt-out .hc-btn { width: 44px; height: 44px; }
  .out-primary { flex: 1; min-width: 0; padding: 4px 6px 4px 10px; }
  .out-field { display: flex; align-items: center; min-height: 36px; }
  .gpt-out textarea.editor { display: block; height: 24px; max-height: 200px; overflow: auto; }

  /* Claude: a card with the editor above a row of 28 px buttons, and a row of pills under it. */
  .cl-card.box { border-radius: 20px; }
  .cl-pad { padding: 8px; }
  .cl-pad .hc-chips { padding: 4px 4px 10px; }
  .cl-edit { padding: 4px 8px 3px; }
  .cl .editor { min-height: 50px; }
  .cl-row { display: flex; align-items: center; height: 28px; margin-top: 2px; }
  .cl .hc-btn { width: 28px; height: 28px; border-radius: 8px; }
  .cl .hc-btn.cl-thin { width: 14px; margin: 0 8px 0 2px; }
  .cl-below { display: flex; align-items: center; height: 28px; margin-top: 8px; padding: 0 6px; }
  .hc-pill { height: 28px; }

  /* Gemini: one row, 16 px in from the pill's edge. */
  .gm-field.box { min-width: 0; margin: 0; border-radius: 32px; }
  .gm-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; padding: 16px; }
  .gm-row .hc-chips { flex: 0 0 100%; padding-bottom: 4px; }
  .gm-lead { display: flex; }
  .gm-text { flex: 1; min-width: 0; padding: 8px 0; }
  .gm-mode { height: 40px; width: 145px; margin: -4px 4px -4px 0; }

  /* Grok: the editor's own wrappers start where the attach button ends. */
  .gk.box { display: flex; flex-wrap: wrap; align-items: flex-end; padding: 13px; border-radius: 29px; }
  .gk .hc-chips { flex: 0 0 100%; padding: 0 0 12px; }
  .gk-mid { flex: 1; min-width: 0; margin-right: 4px; padding: 4px 0; }
  .gk-mid2 { display: flex; align-items: flex-end; }
  .gk-grow { flex: 1; min-width: 0; padding: 0 8px; }
  .gk-model { height: 24px; margin-right: 3px; }
  `;
}

/** The search box every host keeps outside its composer. */
export const SEARCH_BOX = '<input class="hc-search" type="search" aria-label="Search chats" placeholder="Search chats" />';

/** Gemini's first-run screen: it covers a composer that is already in the page. */
export const consentOverlay = () => `
  <div class="hc-scrim" data-hc-consent role="dialog" aria-modal="true" aria-label="Let's get started">
    <div class="hc-dialog"><h2>Let's get started</h2><p>Review how your activity is used before you chat.</p>
    <button type="button" class="hc-cta" data-hc-close>Get started</button></div>
  </div>`;

/**
 * @param {{ uploadMs?: number, refuse?: boolean, fickle?: boolean }} opt `refuse`: the host takes
 *   the file and shows nothing, as a failed upload does. `fickle`: it rebuilds its whole composer
 *   when a file arrives, so the chat box stemLM was writing to is gone.
 */
export function composerScript(id, variant, opt = {}) {
  const config = JSON.stringify({ id, canUpload: variant !== 'out', uploadMs: opt.uploadMs ?? 350, refuse: Boolean(opt.refuse), fickle: Boolean(opt.fickle) });
  return `
  (() => {
    const cfg = ${config};
    const state = { chips: [] };
    const api = window.__standin = { state, renders: 0, uploads: 0, loginWalls: 0 };
    const $ = (sel, root = document) => root.querySelector(sel);
    const ATTACH = '[aria-label="Add files and more"], [data-testid="chat-input-attach"], [aria-label="Upload & tools"], [data-testid="attach-button"]';
    const composer = () => $('[data-hc-composer]');
    const editor = () => $('.editor', composer());
    const text = () => { const e = editor(); return e.matches('textarea') ? e.value : e.innerText; };
    const main = $('main');

    function layout() {
      const c = composer(), e = editor();
      if (!c || !e) return;
      if (e.matches('textarea')) { e.style.height = 'auto'; e.style.height = Math.max(24, e.scrollHeight) + 'px'; }
      if (cfg.id === 'chatgpt') {
        const draft = text();
        const multi = String(state.chips.length > 0 || draft.includes('\\n') || draft.length > 64);
        if (c.dataset.multi !== multi) {
          c.dataset.multi = multi;
          for (const el of c.querySelectorAll('[data-composer-layout]')) el.setAttribute('data-composer-layout', multi === 'true' ? 'multiline' : 'single-line');
          scrub();
        }
      }
    }

    function chipEl(chip) {
      const el = document.createElement('div');
      const dot = chip.name.lastIndexOf('.');
      el.className = 'attachment-chip file-preview';
      if (cfg.id === 'gemini') {
        // Gemini names the file without its extension, in a custom element.
        el.className = 'attachment-chip attachment-preview-wrapper';
        el.innerHTML = '<uploader-file-preview class="file-preview-chip"><gem-attachment class="gem-attachment"><span></span> <span class="gem-attachment-text"></span></gem-attachment></uploader-file-preview>';
        el.querySelector('span').textContent = chip.name.slice(dot + 1).toUpperCase();
        el.querySelector('.gem-attachment-text').textContent = chip.name.slice(0, dot);
      } else {
        el.setAttribute('data-testid', 'file-preview');
        el.append(Object.assign(document.createElement('span'), { textContent: chip.name }));
      }
      if (chip.busy) {
        el.setAttribute('aria-busy', 'true');
        el.insertAdjacentHTML('beforeend', '<span role="progressbar"></span>');
      }
      const x = Object.assign(document.createElement('button'), { type: 'button', className: 'hc-x', textContent: '\\u00d7' });
      x.setAttribute('aria-label', 'Remove file ' + chip.name);
      x.addEventListener('click', () => { state.chips = state.chips.filter((other) => other !== chip); renderChips(); });
      el.append(x);
      return el;
    }

    function renderChips() {
      $('.hc-chips', composer())?.replaceChildren(...state.chips.map(chipEl));
      layout();
      scrub();
    }

    /** A host update of the row: the attach button is a new node, and nothing foreign survives. */
    function scrub() {
      const c = composer();
      for (const el of [c, ...c.querySelectorAll('*')]) {
        for (const a of [...el.attributes]) if (a.name.startsWith('data-stemlm')) el.removeAttribute(a.name);
      }
      const attach = c.querySelector(ATTACH);
      attach.replaceWith(attach.cloneNode(true));
      api.renders += 1;
    }

    function dialog(title, body, extra = '') {
      const scrim = document.createElement('div');
      scrim.className = 'hc-scrim';
      scrim.setAttribute('role', 'dialog');
      scrim.setAttribute('aria-modal', 'true');
      scrim.innerHTML = '<div class="hc-dialog"><h2></h2><p></p>' + extra + '<button type="button" class="hc-cta" data-hc-close>Close</button></div>';
      scrim.querySelector('h2').textContent = title;
      scrim.querySelector('p').textContent = body;
      document.body.append(scrim);
      return scrim;
    }

    function accept(files) {
      for (const file of files || []) {
        if (!cfg.canUpload) { api.loginWalls += 1; dialog('Log in to attach files', 'Create an account or log in to add files to a chat.'); return; }
        api.uploads += 1;
        if (cfg.fickle) { rerender(); return; }
        if (cfg.refuse || state.chips.some((chip) => chip.name === file.name)) continue;
        const chip = { name: file.name, busy: true };
        state.chips.push(chip);
        renderChips();
        setTimeout(() => { chip.busy = false; if (state.chips.includes(chip)) renderChips(); }, cfg.uploadMs);
      }
    }

    /** A full host re-render (a send, a new chat): every node is new, nothing of anyone else's is kept. */
    function rerender() {
      const old = composer(), e = editor();
      const value = e.matches('textarea') ? e.value : e.innerHTML;
      const focused = document.activeElement === e;
      const fresh = old.cloneNode(true);
      fresh.querySelectorAll('.hc-menu').forEach((el) => el.remove());
      for (const el of [fresh, ...fresh.querySelectorAll('*')]) {
        for (const a of [...el.attributes]) if (a.name.startsWith('data-stemlm')) el.removeAttribute(a.name);
      }
      old.replaceWith(fresh);
      const next = editor();
      if (next.matches('textarea')) next.value = value; else next.innerHTML = value;
      api.renders += 1;
      bind();
      renderChips();
      if (focused) next.focus();
    }

    function send() {
      const draft = text().trim();
      if (!draft && !state.chips.length) return;
      const turn = document.createElement('div');
      turn.className = 'turn user';
      turn.setAttribute('data-message-author-role', 'user');
      turn.innerHTML = '<div class="bubble" data-testid="user-message" style="white-space:pre-wrap"></div>';
      turn.firstChild.textContent = draft;
      for (const chip of state.chips) turn.firstChild.prepend(Object.assign(document.createElement('div'), { className: 'file-preview', textContent: chip.name }));
      $('.hero')?.remove();
      $('#thread').append(turn);
      main.classList.remove('landing');
      const e = editor();
      if (e.matches('textarea')) e.value = ''; else e.innerHTML = '';
      state.chips = [];
      rerender();
    }

    function menu(button) {
      const open = button.getAttribute('aria-expanded') === 'true';
      composer().querySelectorAll('.hc-menu').forEach((el) => el.remove());
      button.setAttribute('aria-expanded', String(!open));
      if (open) return;
      const el = document.createElement('div');
      el.className = 'hc-menu';
      el.setAttribute('role', 'menu');
      el.innerHTML = '<div role="menuitem">Upload files</div><div role="menuitem">Add from Drive</div>';
      // Gemini's file input exists only while this menu is open.
      if (cfg.id === 'gemini') el.insertAdjacentHTML('beforeend', '<input type="file" multiple hidden />');
      el.querySelector('input')?.addEventListener('change', (event) => accept(event.target.files));
      composer().append(el);
    }

    function bind() {
      const c = composer(), e = editor();
      e.addEventListener('input', layout);
      e.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } });
      for (const input of c.querySelectorAll('input[type=file]')) {
        input.addEventListener('change', () => { accept(input.files); input.value = ''; });
      }
      c.addEventListener('dragover', (event) => event.preventDefault());
      c.addEventListener('drop', (event) => { event.preventDefault(); accept(event.dataTransfer && event.dataTransfer.files); });
      c.addEventListener('paste', (event) => {
        const files = event.clipboardData && event.clipboardData.files;
        if (files && files.length) { event.preventDefault(); accept(files); }
      });
      c.addEventListener('submit', (event) => { event.preventDefault(); send(); });
      c.addEventListener('click', (event) => {
        if (event.target.closest('.hc-send')) { event.preventDefault(); send(); }
        const attach = event.target.closest(ATTACH);
        if (attach) menu(attach);
      });
    }

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-hc-close]')) event.target.closest('.hc-scrim').remove();
    });

    Object.assign(api, {
      rerender, send, accept,
      /** In-app navigation: the address changes, the thread and the composer are rebuilt. */
      navigate(path, { landing = true, settings = false } = {}) {
        history.pushState({}, '', path);
        $('#thread').innerHTML = landing && !settings ? '<div class="hero">How can I help today?</div>' : '';
        $('.hc-settings')?.remove();
        $('.dock').hidden = settings;
        $('.dock').style.display = settings ? 'none' : '';
        main.classList.toggle('landing', landing && !settings);
        state.chips = [];
        if (settings) {
          $('#thread').insertAdjacentHTML('beforeend', '<div class="hc-settings"><h2>Settings</h2><p>Custom instructions</p><textarea aria-label="Custom instructions" placeholder="What should the assistant know about you?"></textarea><button type="button" class="hc-btn" aria-label="Add files and more">+</button><button type="button" class="hc-cta">Save</button></div>');
          return;
        }
        const e = editor();
        if (e.matches('textarea')) e.value = ''; else e.innerHTML = '';
        rerender();
      },
      /** An earlier message opened for editing: an editor of the same kind, with no attach button. */
      editMessage() {
        let turn = $('#thread .turn.user');
        if (!turn) { turn = document.createElement('div'); turn.className = 'turn user'; turn.setAttribute('data-message-author-role', 'user'); $('#thread').prepend(turn); }
        turn.innerHTML = '<form class="hc-editbox" data-testid="user-message"><rich-textarea><div class="ProseMirror ql-editor tiptap hc-edit-field" contenteditable="true" role="textbox" aria-label="Edit message">An earlier question</div></rich-textarea><textarea aria-label="Edit message">An earlier question</textarea><div class="hc-row"><button type="button" class="hc-pill">Cancel</button><button type="submit" class="hc-cta">Send</button></div></form>';
      },
      /** A document canvas beside the chat: a rich editor that is not the composer. */
      openCanvas() {
        document.body.insertAdjacentHTML('beforeend', '<aside class="hc-canvas"><div class="hc-row"><button type="button" class="hc-btn" aria-label="Add comment">+</button></div><div class="ProseMirror hc-doc" contenteditable="true" role="textbox" aria-label="Canvas document">A draft document.</div></aside>');
      },
      openDialog() {
        return dialog('Custom instructions', 'What should the assistant know about you?', '<textarea aria-label="Custom instructions"></textarea>');
      },
      closeDialog() { document.querySelectorAll('.hc-scrim').forEach((el) => el.remove()); },
    });

    bind();
    layout();
  })();`;
}
