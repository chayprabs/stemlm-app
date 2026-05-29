// Build-time constants injected by Vite `define` in wxt.config.ts.
// These hold the GA4 Measurement Protocol credentials (empty by default).
declare const __GA_MEASUREMENT_ID__: string;
declare const __GA_API_SECRET__: string;

// Allow importing raw text assets (playbooks / protocol) via ?raw.
declare module '*?raw' {
  const content: string;
  export default content;
}

// html2pdf.js ships no types — minimal fluent declaration covering our use.
declare module 'html2pdf.js' {
  interface Html2PdfWorker {
    set(opt: Record<string, unknown>): Html2PdfWorker;
    from(element: HTMLElement | string): Html2PdfWorker;
    save(): Promise<void>;
    toPdf(): Html2PdfWorker;
    outputPdf(type?: string): Promise<unknown>;
  }
  function html2pdf(): Html2PdfWorker;
  export default html2pdf;
}
