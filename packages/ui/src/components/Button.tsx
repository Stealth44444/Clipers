import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonStyleOptions = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; pill?: boolean; className?: string };

export function buttonClass({ variant = 'secondary', size = 'md', block, pill, className }: ButtonStyleOptions = {}): string {
  return cx('cl-button', `cl-button--${variant}`, `cl-button--${size}`, block && 'cl-button--block', pill && 'cl-button--pill', className);
}

type ButtonContentProps = { icon?: ReactNode; iconEnd?: ReactNode };

export type ButtonProps = ButtonStyleOptions & ButtonContentProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant, size, block, pill, className, icon, iconEnd, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, pill, className })} {...rest}>
      {icon}
      {children}
      {iconEnd}
    </button>
  );
}

export type ButtonLinkProps = ButtonStyleOptions & ButtonContentProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function ButtonLink({ variant, size, block, pill, className, icon, iconEnd, children, ...rest }: ButtonLinkProps) {
  return (
    <a className={buttonClass({ variant, size, block, pill, className })} {...rest}>
      {icon}
      {children}
      {iconEnd}
    </a>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string };

export function IconButton({ label, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cx('cl-icon-button', className)} {...rest}>
      {children}
    </button>
  );
}
