/** stemLM wordmark: "stem" in foreground + "LM" in accent teal. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={`slm-wordmark ${className ?? ''}`}>
      <span className="slm-wordmark-stem">stem</span>
      <span className="slm-wordmark-lm">LM</span>
    </span>
  );
}
