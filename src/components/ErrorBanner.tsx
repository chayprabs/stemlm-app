/**
 * The panel's status line. The first line says what happened and what to do;
 * anything after it is a technical detail kept behind "Details" (UX-ERR-01).
 */
export function ErrorBanner({ message, tone }: { message: string; tone: 'error' | 'info' }) {
  const [lead, ...rest] = message.split('\n');
  const detail = rest.join('\n').trim();
  return (
    <div className={`slm-banner ${tone === 'error' ? 'slm-banner-error' : 'slm-banner-info'}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{lead}</span>
      {detail && (
        <details className="slm-banner-details">
          <summary>Details</summary>
          <p>{detail}</p>
        </details>
      )}
    </div>
  );
}
