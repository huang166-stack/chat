import type { HTMLAttributes, ReactNode } from 'react';

export interface TechCardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
  interactive?: boolean;
  children: ReactNode;
}

export function TechCard({
  accent = false,
  interactive = false,
  className = '',
  children,
  ...props
}: TechCardProps) {
  return (
    <div
      className={`rounded-card border border-line bg-ink-800 ${
        accent ? 'border-t-2 border-t-brand-500' : ''
      } ${
        interactive
          ? 'transition duration-200 hover:-translate-y-0.5 hover:border-brand-500/45'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
