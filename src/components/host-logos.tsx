import type { SVGProps } from 'react';
import type { PlatformId } from '@/src/platforms/types';

type LogoProps = SVGProps<SVGSVGElement> & { size?: number };

function box({ size = 18, ...rest }: LogoProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true as const,
    ...rest,
  };
}

/** Simplified ChatGPT bloom — geometric 6-node knot at toolbar size. */
export function ChatGptLogo(props: LogoProps) {
  return (
    <svg {...box(props)}>
      <path d="M12.9 2.4c-.55-.32-1.25-.32-1.8 0L7.7 4.5l4.3 2.48 4.3-2.48-3.4-2.1ZM6.55 5.16 3.7 6.9c-.55.32-.9.9-.9 1.54v3.4l4.3-2.47V5.16Zm10.9 0v4.21l4.3 2.47v-3.4c0-.64-.35-1.22-.9-1.54l-2.85-1.74ZM3.8 12.85v3.4c0 .64.35 1.22.9 1.54l2.85 1.74v-4.21L3.8 12.85Zm16.4 0-4.3 2.47v4.21l2.85-1.74c.55-.32.9-.9.9-1.54v-3.4ZM7.7 19.5l3.4 2.1c.55.32 1.25.32 1.8 0l3.4-2.1-4.3-2.48-4.3 2.48Z" />
    </svg>
  );
}

/** Claude asterisk. */
export function ClaudeLogo(props: LogoProps) {
  return (
    <svg {...box(props)}>
      <path d="M11.15 2.2h1.7l.28 7.05 5.95-3.82.95 1.46-6.18 2.55 6.18 2.55-.95 1.46-5.95-3.82-.28 7.05h-1.7l-.28-7.05-5.95 3.82-.95-1.46 6.18-2.55-6.18-2.55.95-1.46 5.95 3.82.28-7.05Z" />
    </svg>
  );
}

/** Gemini four-point spark. */
export function GeminiLogo(props: LogoProps) {
  return (
    <svg {...box(props)}>
      <path d="M12 1.6c.28 2.9 1.55 5.3 3.7 7.1 1.95 1.6 4.3 2.5 6.7 2.7-2.4.2-4.75 1.1-6.7 2.7-2.15 1.8-3.42 4.2-3.7 7.1-.28-2.9-1.55-5.3-3.7-7.1-1.95-1.6-4.3-2.5-6.7-2.7 2.4-.2 4.75-1.1 6.7-2.7 2.15-1.8 3.42-4.2 3.7-7.1Z" />
    </svg>
  );
}

/** Grok spark-star. */
export function GrokLogo(props: LogoProps) {
  return (
    <svg {...box(props)}>
      <path d="M12 2.1 13.7 8.4 20 10.2 13.7 12l-1.7 6.3L10.3 12 4 10.2 10.3 8.4 12 2.1Zm6.4 11.2 1.05 3.15 3.15 1.05-3.15 1.05-1.05 3.15-1.05-3.15-3.15-1.05 3.15-1.05 1.05-3.15ZM5.7 4.8l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" />
    </svg>
  );
}

export function HostLogo({ id, size = 18, ...rest }: LogoProps & { id: PlatformId }) {
  if (id === 'chatgpt') return <ChatGptLogo size={size} {...rest} />;
  if (id === 'claude') return <ClaudeLogo size={size} {...rest} />;
  if (id === 'gemini') return <GeminiLogo size={size} {...rest} />;
  return <GrokLogo size={size} {...rest} />;
}
