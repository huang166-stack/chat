'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  techButtonClassName,
  type TechButtonSize,
  type TechButtonVariant,
} from './tech-button';

export interface TechLinkProps {
  href: string;
  variant?: TechButtonVariant;
  size?: TechButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
  onClick?: () => void;
}

export function TechLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: TechLinkProps) {
  return (
    <Link
      href={href}
      className={techButtonClassName({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
