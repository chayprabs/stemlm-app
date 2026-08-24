/**
 * Trigger a real file download in the current document (popup, overlay, or
 * extension page). No Gemini tab, no print dialog.
 */
export function downloadTextFile(
  contents: string,
  filename: string,
  mime = 'text/html;charset=utf-8',
): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
