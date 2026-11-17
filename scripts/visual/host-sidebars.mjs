/**
 * The sidebar of each stand-in page, built from the real sites' DOM.
 *
 * Elements, attributes, labels, positions and open widths follow the capture of 2026-11-17
 * (viewport 1528x732). A fold control is labelled by what pressing it will do:
 *
 *   ChatGPT  two controls with aria-controls="ds-sidebar": "Open sidebar" 8,8,40,36 (it keeps
 *            aria-expanded, and stays laid out underneath the open sidebar) and "Close sidebar"
 *            210,4,44,44; nav "Sidebar shortcuts" 0,0,259,732 holding nav "Sidebar" 6,60,247,252.
 *   Claude   <aside aria-label="Sidebar"> 0,0,288,732; button "Hide sidebar" 12,8,28,28.
 *   Gemini   <bard-sidenav aria-label="Side Navigation"> 0,0,288,732; button "Close sidebar"
 *            244,8,36,36 with aria-expanded.
 *   Grok     none when logged out; logged in it is believed to be the shadcn sidebar:
 *            [data-sidebar="sidebar"] in a fixed 16rem column, button[data-sidebar="trigger"]
 *            with no aria-label.
 *
 * Not in the capture, so assumed here: which ChatGPT element carries id="ds-sidebar" (the outer
 * nav), the folded widths (ChatGPT 52px rail, Claude 52px, Gemini 72px, Grok 3rem), the labels
 * of the folded controls ("Show sidebar" on Claude, "Open sidebar" on Gemini) and the 200ms
 * animation. Below 768px every host hides its sidebar, as the sites do.
 */

const PANEL_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>';

const CHATS = ['Incline with friction', 'Voltage divider', 'Dijkstra walkthrough'];
const LIST = `<div class="sb-item on">New chat</div><div class="sb-item">Search chats</div><div class="sb-gap"></div>${CHATS.map((t) => `<div class="sb-item">${t}</div>`).join('')}`;

/** A fold control at the position the capture gives it. */
const button = (attrs, box) =>
  `<button type="button" class="sb-btn" ${attrs} style="left:${box[0]}px;top:${box[1]}px;width:${box[2]}px;height:${box[3]}px">${PANEL_ICON}</button>`;

const MARKUP = {
  chatgpt: `
  <div class="sb" data-sb data-open="true" style="--sb-open:259px;--sb-rail:52px">
    <div class="sb-rail">${button('aria-label="Open sidebar" aria-expanded="true" aria-controls="ds-sidebar" data-sb-open', [8, 8, 40, 36])}</div>
    <nav id="ds-sidebar" class="sb-face" aria-label="Sidebar shortcuts">
      ${button('aria-label="Close sidebar" aria-controls="ds-sidebar" data-sb-close', [210, 4, 44, 44])}
      <nav aria-label="Sidebar" class="sb-list" style="left:6px;top:60px;width:247px">${LIST}</nav>
    </nav>
  </div>`,
  claude: `
  <aside class="sb" data-sb data-open="true" aria-label="Sidebar" style="--sb-open:288px;--sb-rail:52px">
    ${button('aria-label="Hide sidebar" data-sb-toggle="Hide sidebar|Show sidebar"', [12, 8, 28, 28])}
    <div class="sb-list" style="left:8px;top:56px;width:272px">${LIST}</div>
  </aside>`,
  gemini: `
  <bard-sidenav class="sb" data-sb data-open="true" aria-label="Side Navigation" style="--sb-open:288px;--sb-rail:72px">
    ${button('aria-label="Close sidebar" aria-expanded="true" data-sb-toggle="Close sidebar|Open sidebar"', [244, 8, 36, 36])}
    <div class="sb-list" style="left:12px;top:64px;width:264px">${LIST}</div>
  </bard-sidenav>`,
  grok: `
  <div class="group peer sb-shad" data-sb data-state="expanded" data-collapsible="" data-variant="sidebar" data-side="left">
    <div class="sb-shad-gap"></div>
    <div class="sb-shad-fixed">
      <div data-sidebar="sidebar" class="sb-shad-inner">
        <div data-sidebar="content" class="sb-list" style="left:8px;top:56px;width:240px">${LIST}</div>
        <div data-sidebar="footer">${button('data-sidebar="trigger"', [8, 8, 32, 32]).replace('</button>', '<span class="sr-only">Toggle Sidebar</span></button>')}</div>
      </div>
    </div>
  </div>`,
};

const css = (c) => `
  .sb { position: relative; flex: none; height: 100%; width: var(--sb-open); background: ${c.side}; color: ${c.muted}; overflow: hidden; transition: width .2s ease; }
  .sb[data-open="false"] { width: var(--sb-rail); }
  .sb-rail { position: absolute; inset: 0 auto 0 0; width: var(--sb-rail); }
  .sb-face { position: absolute; inset: 0 auto 0 0; width: var(--sb-open); background: ${c.side}; }
  .sb[data-open="false"] .sb-face.is-gone { visibility: hidden; }
  .sb-btn { position: absolute; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: transparent; color: ${c.muted}; padding: 0; }
  .sb-btn:hover { background: ${c.bubble}; color: ${c.fg}; }
  bard-sidenav[data-open="false"] > .sb-btn { left: 18px !important; }
  .sb-list { position: absolute; display: flex; flex-direction: column; gap: 4px; font-size: 14px; white-space: nowrap; transition: opacity .15s ease; }
  .sb[data-open="false"] > .sb-list, .sb-shad[data-state="collapsed"] .sb-list { opacity: 0; pointer-events: none; }
  .sb-item { height: 34px; border-radius: 9px; padding: 0 10px; display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis; }
  .sb-item.on { background: ${c.bubble}; color: ${c.fg}; }
  .sb-gap { height: 14px; }
  .sb-shad { flex: none; height: 100%; }
  .sb-shad-gap { width: 16rem; height: 100%; transition: width .2s linear; }
  .sb-shad-fixed { position: fixed; top: 0; bottom: 0; left: 0; z-index: 10; width: 16rem; transition: width .2s linear; }
  .sb-shad[data-state="collapsed"] .sb-shad-gap, .sb-shad[data-state="collapsed"] .sb-shad-fixed { width: 3rem; }
  .sb-shad-inner { position: relative; width: 100%; height: 100%; background: ${c.side}; color: ${c.muted}; overflow: hidden; }
  @media (max-width: 767px) { [data-sb] { display: none; } }
  @media (prefers-reduced-motion: reduce) { .sb, .sb-list, .sb-shad-gap, .sb-shad-fixed { transition: none; } }`;

/** Each site's own behaviour: the control flips the sidebar and relabels itself for its next action. */
const SCRIPT = `
  (() => {
    const root = document.querySelector('[data-sb]');
    if (!root) return;
    const face = root.querySelector('.sb-face');
    const set = (open) => {
      if (root.hasAttribute('data-state')) {
        root.setAttribute('data-state', open ? 'expanded' : 'collapsed');
        root.setAttribute('data-collapsible', open ? '' : 'icon');
        return;
      }
      root.setAttribute('data-open', String(open));
      // ChatGPT: the open face is clipped away as the column narrows, then taken out, which
      // leaves the rail's control on top.
      if (face) {
        if (open) face.classList.remove('is-gone');
        else setTimeout(() => { if (root.getAttribute('data-open') === 'false') face.classList.add('is-gone'); }, 220);
        root.querySelector('[data-sb-open]').setAttribute('aria-expanded', String(open));
      }
      const toggle = root.querySelector('[data-sb-toggle]');
      if (!toggle) return;
      const [whenOpen, whenFolded] = toggle.getAttribute('data-sb-toggle').split('|');
      toggle.setAttribute('aria-label', open ? whenOpen : whenFolded);
      if (toggle.hasAttribute('aria-expanded')) toggle.setAttribute('aria-expanded', String(open));
    };
    const isOpen = () => (root.hasAttribute('data-state') ? root.getAttribute('data-state') === 'expanded' : root.getAttribute('data-open') === 'true');
    window.__sidebar = { presses: 0, isOpen, set };
    const on = (selector, next) => root.querySelector(selector)?.addEventListener('click', () => { window.__sidebar.presses += 1; set(next()); });
    on('[data-sb-close]', () => false);
    on('[data-sb-open]', () => true);
    on('[data-sb-toggle]', () => !isOpen());
    on('[data-sidebar="trigger"]', () => !isOpen());
  })();`;

/**
 * @param {'chatgpt'|'claude'|'gemini'|'grok'} id
 * @param {object} colors the host skin for the current scheme (hosts.mjs)
 * @param {{ sidebar?: false | 'folded' }} [opt] `false`: a logged-out page with no sidebar.
 *   `'folded'`: the student folded it before opening the panel.
 */
export function hostSidebar(id, colors, opt = {}) {
  if (opt.sidebar === false) return '';
  const start = opt.sidebar === 'folded' ? '<script>window.__sidebar.set(false); window.__sidebar.presses = 0;</script>' : '';
  return `<style>${css(colors)}</style>${MARKUP[id]}<script>${SCRIPT}</script>${start}`;
}
