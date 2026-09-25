// Build-time constants injected by Vite `define` in wxt.config.ts.

// Allow importing raw text assets (playbooks / protocol) via ?raw.
declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '*?inline' {
  const content: string;
  export default content;
}

declare module 'wavedrom';

interface ImportMeta {
  glob<T>(pattern: string, options: { eager: true; query: string; import: 'default' }): Record<string, T>;
}

