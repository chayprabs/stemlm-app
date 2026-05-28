// Build-time constants injected by Vite `define` in wxt.config.ts.
// These hold the GA4 Measurement Protocol credentials (empty by default).
declare const __GA_MEASUREMENT_ID__: string;
declare const __GA_API_SECRET__: string;

// Allow importing raw text assets (playbooks / protocol) via ?raw.
declare module '*?raw' {
  const content: string;
  export default content;
}
