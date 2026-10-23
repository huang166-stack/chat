import type { ReactNode } from 'react';

export interface SectionTitleProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
}: SectionTitleProps) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`flex flex-col gap-3 ${alignment} ${className}`}>
      {eyebrow ? (
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-brand-400">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="text-3xl font-bold leading-tight text-copy md:text-4xl">{title}</h2>
      {description ? (
        <p className="max-w-3xl text-sm leading-7 text-copy-muted md:text-base">{description}</p>
      ) : null}
    </div>
  );
}
