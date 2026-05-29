/**
 * Holds a reference to the content-script shadow-root container so utilities
 * outside React (e.g. PDF export) can mount offscreen nodes where the panel's
 * injected styles (Tailwind, KaTeX, panel.css) are available.
 */
let reportMount: HTMLElement | null = null;

export function setReportMount(el: HTMLElement): void {
  reportMount = el;
}

export function getReportMount(): HTMLElement {
  return reportMount ?? document.body;
}
