'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type TechButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type TechButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<TechButtonVariant, string> = {
  primary: 'bg-brand-500 text-ink-950 hover:bg-brand-400 hover:shadow-glow',
  secondary: 'border border-white/35 text-white hover:border-brand-500 hover:text-brand-400',
  ghost: 'text-brand-400 hover:bg-brand-500/10',
  danger: 'bg-risk-high text-white hover:bg-risk-high/85',
};

const sizeClass: Record<TechButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
};

export interface TechButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TechButtonVariant;
  size?: TechButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export function TechButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...props
}: TechButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[2px] font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}